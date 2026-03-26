import './config/env'; // Must be first: loads .env before any other module reads process.env
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { connectDatabase } from './config/database';
import sequelize from './config/database';
import { QueryTypes } from 'sequelize';
import './models'; // initialise associations
import { User, SipProject, Department, ProjectStatusUpdate, ProjectPlan } from './models';
import { Op } from 'sequelize';
import { UserRole, SipProjectStatus, SipPriority, ProjectTrackingStatus, PlanStatus, ProjectPlanStatus } from './types';
import { sendProjectStartEmail, sendMonthlyStatusRequestEmail } from './services/emailService';
import { isLikelyTransientSqlError, retry } from './utils/retry';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import dashboardRoutes from './routes/dashboard';
import departmentRoutes from './routes/departments';
import sipProjectRoutes from './routes/sipProjects';
import feasibilityReviewRoutes from './routes/feasibilityReviews';
import projectPlanRoutes from './routes/projectPlans';
import projectTrackingRoutes from './routes/projectTracking';

import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Trust the first proxy hop (Azure App Service / reverse proxy).
// Required so that express-rate-limit and req.ip read the real client IP
// from the X-Forwarded-For header rather than the proxy's internal address.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  } : false,
}));

// CORS - allow React frontend (in production, frontend is served from same origin)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || isProduction) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(compression());
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Health check (Azure App Service requirement)
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/sip-projects', sipProjectRoutes);
app.use('/api/feasibility-reviews', feasibilityReviewRoutes);
app.use('/api/project-plans', projectPlanRoutes);
app.use('/api/project-tracking', projectTrackingRoutes);

// Serve React SPA in production (frontend built into dist/public by CI/CD)
if (isProduction) {
  const staticPath = path.join(__dirname, 'public');
  app.use(express.static(staticPath));
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      res.sendFile(path.join(staticPath, 'index.html'));
    }
  });
}

// Error handling
app.use(notFound);
app.use(errorHandler);

// Add any columns that were introduced after the initial production deployment.
// sync({ alter: false }) only creates missing tables, not missing columns on existing tables.
const migrateMissingColumns = async (): Promise<void> => {
  // Helper: add a column to a table if it doesn't already exist
  const addColumnIfMissing = async (table: string, column: string, definition: string): Promise<void> => {
    await sequelize.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID(N'${table}') AND name = N'${column}'
      )
      BEGIN
        ALTER TABLE [${table}] ADD [${column}] ${definition};
      END
    `);
  };

  // Helper: alter a date column from DATETIME or DATETIME2 to DATETIMEOFFSET(3) if needed.
  // Sequelize's DataTypes.DATE serialises values with a timezone offset
  // (e.g. "2026-03-17 16:05:01.730 +00:00") which SQL Server's DATETIME and DATETIME2
  // types cannot parse, causing "Conversion failed when converting date and/or time
  // from character string". DATETIMEOFFSET(3) accepts that format correctly.
  const fixDateColumnType = async (table: string, column: string): Promise<void> => {
    const rows = await sequelize.query<{ DATA_TYPE: string }>(
      `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = N'${table}' AND COLUMN_NAME = N'${column}'`,
      { type: QueryTypes.SELECT }
    );
    if (rows.length > 0) {
      const dataType = rows[0].DATA_TYPE.toLowerCase();
      if (dataType === 'datetime' || dataType === 'datetime2') {
        await sequelize.query(`ALTER TABLE [${table}] ALTER COLUMN [${column}] DATETIMEOFFSET(3) NULL`);
        console.log(`[Migrate] Converted ${table}.${column} from ${dataType.toUpperCase()} to DATETIMEOFFSET(3).`);
      }
    }
  };

  // Departments: contactEmail added after initial deployment
  await addColumnIfMissing('Departments', 'contactEmail', 'NVARCHAR(255) NULL');

  // Users: departmentId – links director/director_head_of users to their department
  await addColumnIfMissing('Users', 'departmentId', 'UNIQUEIDENTIFIER NULL');

  // SipProjects: Stage 2 – approval/rejection fields (added after initial Stage 1 deployment)
  // Use DATETIMEOFFSET(3) so that Sequelize's timezone-offset date strings are accepted.
  await addColumnIfMissing('SipProjects', 'submittedAt', 'DATETIMEOFFSET(3) NULL');
  await addColumnIfMissing('SipProjects', 'approvedById', 'UNIQUEIDENTIFIER NULL');
  await addColumnIfMissing('SipProjects', 'approvedAt', 'DATETIMEOFFSET(3) NULL');
  await addColumnIfMissing('SipProjects', 'feasibilityReviewerId', 'UNIQUEIDENTIFIER NULL');
  await addColumnIfMissing('SipProjects', 'feasibilityReviewerAssignedAt', 'DATETIMEOFFSET(3) NULL');
  await addColumnIfMissing('SipProjects', 'rejectedById', 'UNIQUEIDENTIFIER NULL');
  await addColumnIfMissing('SipProjects', 'rejectedAt', 'DATETIMEOFFSET(3) NULL');
  await addColumnIfMissing('SipProjects', 'rejectionReason', 'NVARCHAR(MAX) NULL');
  await addColumnIfMissing(
    'SipProjects',
    'mitigationEffectiveness',
    "NVARCHAR(50) NOT NULL DEFAULT 'Partially Effective'"
  );

  // SipProjects: Stage 3 feasibility decision fields
  await addColumnIfMissing('SipProjects', 'feasibilityAcceptedById', 'UNIQUEIDENTIFIER NULL');
  await addColumnIfMissing('SipProjects', 'feasibilityAcceptedAt', 'DATETIMEOFFSET(3) NULL');
  await addColumnIfMissing('SipProjects', 'feasibilityRejectedById', 'UNIQUEIDENTIFIER NULL');
  await addColumnIfMissing('SipProjects', 'feasibilityRejectedAt', 'DATETIMEOFFSET(3) NULL');
  await addColumnIfMissing('SipProjects', 'feasibilityRejectionReason', 'NVARCHAR(MAX) NULL');

  // SipProjects: Stage 3 cyber override fields
  await addColumnIfMissing('SipProjects', 'cyberAcceptedById', 'UNIQUEIDENTIFIER NULL');
  await addColumnIfMissing('SipProjects', 'cyberAcceptedAt', 'DATETIMEOFFSET(3) NULL');
  await addColumnIfMissing('SipProjects', 'cyberReportedById', 'UNIQUEIDENTIFIER NULL');
  await addColumnIfMissing('SipProjects', 'cyberReportedAt', 'DATETIMEOFFSET(3) NULL');

  // SipProjects: rejection reason draft (saved before final rejection)
  await addColumnIfMissing('SipProjects', 'rejectionReasonDraft', 'NVARCHAR(MAX) NULL');

  // SipProjects: Stage 5 – active tracking fields
  await addColumnIfMissing('SipProjects', 'activeStartDate', 'DATETIMEOFFSET(3) NULL');
  await addColumnIfMissing('SipProjects', 'startNotificationSentAt', 'DATETIMEOFFSET(3) NULL');

  // Fix any existing DATETIME columns that were created before this correction.
  // These must be DATETIMEOFFSET(3) to be compatible with Sequelize's date serialisation.
  const dateColumnsToFix = [
    'submittedAt', 'approvedAt', 'feasibilityReviewerAssignedAt',
    'rejectedAt', 'feasibilityAcceptedAt', 'feasibilityRejectedAt',
    'cyberAcceptedAt', 'cyberReportedAt', 'activeStartDate', 'startNotificationSentAt',
  ];
  for (const col of dateColumnsToFix) {
    await fixDateColumnType('SipProjects', col);
  }

  // FeasibilityReviews: suggestedSolution field added (moved from understandProblem to explicit text field)
  await addColumnIfMissing('FeasibilityReviews', 'suggestedSolution', "NVARCHAR(MAX) NOT NULL DEFAULT ''");

  // FeasibilityReviews: conclusion field added in PR #151
  await addColumnIfMissing('FeasibilityReviews', 'conclusion', 'NVARCHAR(50) NULL');

  // FeasibilityReviews: cost and resource numeric fields added after initial deployment
  await addColumnIfMissing('FeasibilityReviews', 'setupCosts', 'FLOAT NULL');
  await addColumnIfMissing('FeasibilityReviews', 'annualOngoingCost', 'FLOAT NULL');
  await addColumnIfMissing('FeasibilityReviews', 'setupResources', 'FLOAT NULL');
  await addColumnIfMissing('FeasibilityReviews', 'annualOngoingResources', 'FLOAT NULL');
  await addColumnIfMissing('FeasibilityReviews', 'additionalResources', 'FLOAT NULL');

  // Helper: change a column from NOT NULL to NULL if it was created with a NOT NULL
  // constraint before the model was updated.  sync({ alter: false }) (used in production)
  // never alters existing columns, so columns that were originally synced as NOT NULL
  // stay that way even after the Sequelize model gains allowNull: true.
  const alterColumnToNullable = async (table: string, column: string, dataType: string): Promise<void> => {
    const [schemaName, tableName] = table.includes('.') ? table.split('.', 2) : ['dbo', table];
    const qualifiedTable = `[${schemaName}].[${tableName}]`;
    const alterSql = `ALTER TABLE ${qualifiedTable} ALTER COLUMN [${column}] ${dataType} NULL`;

    try {
      const rows = await sequelize.query<{ IS_NULLABLE: string }>(
        `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = N'${schemaName}' AND TABLE_NAME = N'${tableName}' AND COLUMN_NAME = N'${column}'`,
        { type: QueryTypes.SELECT }
      );
      if (rows.length > 0 && rows[0].IS_NULLABLE === 'YES') {
        return;
      }

      try {
        // Try the ALTER first. In many environments this succeeds without dropping defaults.
        await sequelize.query(alterSql);
        console.log(`[Migrate] Altered ${schemaName}.${tableName}.${column} to ${dataType} NULL.`);
      } catch (alterErr) {
        // Fallback: drop any bound DEFAULT constraint, then retry ALTER.
        // This avoids OBJECT_ID(N'table') lookups, which can fail in some Azure SQL setups.
        await sequelize.query(`
          DECLARE @dfName NVARCHAR(255);
          SELECT @dfName = dc.name
          FROM sys.default_constraints dc
          JOIN sys.columns c
            ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
          JOIN sys.tables t
            ON c.object_id = t.object_id
          JOIN sys.schemas s
            ON t.schema_id = s.schema_id
          WHERE s.name = N'${schemaName}'
            AND t.name = N'${tableName}'
            AND c.name = N'${column}';
          IF @dfName IS NOT NULL
            EXEC('ALTER TABLE ${qualifiedTable} DROP CONSTRAINT [' + @dfName + ']');
        `);
        await sequelize.query(alterSql);
        console.log(`[Migrate] Altered ${schemaName}.${tableName}.${column} to ${dataType} NULL after dropping DEFAULT.`);
      }
    } catch (err) {
      // Log but do not crash startup – the column constraint issue is non-fatal.
      console.warn(`[Migrate] Could not alter ${schemaName}.${tableName}.${column} to nullable:`, err);
    }
  };

  // Ensure all five cost/resource columns on FeasibilityReviews are nullable.
  // If a previous sync() created them as NOT NULL (before allowNull: true was set in the
  // model), inserts that omit these optional fields would fail with:
  //   "Cannot insert the value NULL into column 'setupCosts'"
  await alterColumnToNullable('FeasibilityReviews', 'setupCosts', 'FLOAT');
  await alterColumnToNullable('FeasibilityReviews', 'annualOngoingCost', 'FLOAT');
  await alterColumnToNullable('FeasibilityReviews', 'setupResources', 'FLOAT');
  await alterColumnToNullable('FeasibilityReviews', 'annualOngoingResources', 'FLOAT');
  await alterColumnToNullable('FeasibilityReviews', 'additionalResources', 'FLOAT');

  // FeasibilityReviews: fix submittedAt from DATETIME to DATETIMEOFFSET(3)
  await fixDateColumnType('FeasibilityReviews', 'submittedAt');

  // Users: fix lastLoginAt from DATETIME to DATETIMEOFFSET(3) if needed
  // This column is set on every login – a DATETIME type causes "Conversion failed" on save.
  await fixDateColumnType('Users', 'lastLoginAt');

  // ProjectMilestones: details field added to allow milestone descriptions
  await addColumnIfMissing('ProjectMilestones', 'details', 'NVARCHAR(MAX) NULL');

  // ProjectMilestones: fix completedAt from DATETIME to DATETIMEOFFSET(3) if needed
  await fixDateColumnType('ProjectMilestones', 'completedAt');

  // ProjectStatusUpdates: fix submittedAt from DATETIME to DATETIMEOFFSET(3) if needed
  await fixDateColumnType('ProjectStatusUpdates', 'submittedAt');

  // ProjectPlans: cyber rejection fields added for cyber-reject revision workflow
  await addColumnIfMissing('ProjectPlans', 'cyberReviewedById', 'UNIQUEIDENTIFIER NULL');
  await addColumnIfMissing('ProjectPlans', 'cyberReviewedAt', 'DATETIMEOFFSET(3) NULL');
  await addColumnIfMissing('ProjectPlans', 'cyberRejectionReason', 'NVARCHAR(MAX) NULL');

  // ProjectPlans: startDateAmended flag – set when a status update amends the project start date
  await addColumnIfMissing('ProjectPlans', 'startDateAmended', 'BIT NOT NULL DEFAULT 0');

  // ProjectPlans: fix DATE columns from DATETIME to DATETIMEOFFSET(3) if needed.
  // These are set during the plan approval workflow; DATETIME type causes "Conversion failed" errors.
  await fixDateColumnType('ProjectPlans', 'submittedAt');
  await fixDateColumnType('ProjectPlans', 'directorReviewedAt');
  await fixDateColumnType('ProjectPlans', 'cyberApprovedAt');

  // Fix Sequelize auto-managed timestamp columns (createdAt, updatedAt) on all tables.
  // When tables were created by an older Sequelize/tedious version, these columns may be
  // DATETIME or DATETIME2. Current Sequelize 6.x + tedious 18.x writes DATETIMEOFFSET-
  // formatted strings (e.g. "2026-03-17 16:05:01.730 +00:00") which DATETIME and DATETIME2
  // cannot parse, causing "Conversion failed" on every INSERT and UPDATE — blocking all
  // write operations throughout the system.
  const allTables = [
    'FeasibilityReviews', 'SipProjects', 'Users', 'ProjectPlans',
    'ProjectMilestones', 'ProjectStatusUpdates', 'Departments',
  ];
  for (const table of allTables) {
    await fixDateColumnType(table, 'createdAt');
    await fixDateColumnType(table, 'updatedAt');
  }

  console.log('[Migrate] Missing columns verified/added.');
};

// Update ENUM CHECK constraints for SipProjects (status and priority) so that
// newly-added enum values are accepted by the database.
// Drops ALL check constraints on the table to avoid missing any Sequelize-generated
// constraint (regardless of naming or column-level vs table-level), then recreates
// only the ones we need.
const migrateSipProjectConstraints = async (): Promise<void> => {
  // Drop ALL check constraints on SipProjects atomically using dynamic SQL.
  // This ensures even constraints with generated names (from Sequelize sync) are fully removed
  // before recreating them with the full current set of allowed enum values.
  await sequelize.query(`
    DECLARE @sql NVARCHAR(MAX) = N'';
    SELECT @sql += 'ALTER TABLE [SipProjects] DROP CONSTRAINT [' + cc.name + '];'
    FROM sys.check_constraints cc
    WHERE cc.parent_object_id = OBJECT_ID(N'SipProjects');
    IF LEN(@sql) > 0 EXEC sp_executesql @sql;
  `);

  // Recreate with the full current set of allowed values.
  const statusValues = Object.values(SipProjectStatus).map((v) => `'${v}'`).join(', ');
  const priorityValues = Object.values(SipPriority).map((v) => `'${v}'`).join(', ');

  await sequelize.query(`
    ALTER TABLE [SipProjects] WITH NOCHECK ADD CONSTRAINT [SipProjects_status_chk]
      CHECK ([status] IN (${statusValues}))
  `);
  await sequelize.query(`
    ALTER TABLE [SipProjects] WITH NOCHECK ADD CONSTRAINT [SipProjects_priority_chk]
      CHECK ([priority] IN (${priorityValues}))
  `);

  console.log('[Migrate] SipProject ENUM constraints updated.');
};

// Migrate ENUM CHECK constraints for ProjectStatusUpdates (status) and
// ProjectPlans (planStatus, status) so that newly-added enum values are accepted.
const migrateProjectTrackingConstraints = async (): Promise<void> => {
  // ProjectStatusUpdates – drop all check constraints then recreate status one
  await sequelize.query(`
    DECLARE @sql NVARCHAR(MAX) = N'';
    SELECT @sql += 'ALTER TABLE [ProjectStatusUpdates] DROP CONSTRAINT [' + cc.name + '];'
    FROM sys.check_constraints cc
    WHERE cc.parent_object_id = OBJECT_ID(N'ProjectStatusUpdates');
    IF LEN(@sql) > 0 EXEC sp_executesql @sql;
  `);
  const trackingStatusValues = Object.values(ProjectTrackingStatus).map((v) => `'${v}'`).join(', ');
  await sequelize.query(`
    ALTER TABLE [ProjectStatusUpdates] WITH NOCHECK ADD CONSTRAINT [ProjectStatusUpdates_status_chk]
      CHECK ([status] IN (${trackingStatusValues}))
  `);
  console.log('[Migrate] ProjectStatusUpdates ENUM constraint updated.');

  // ProjectPlans – drop all check constraints then recreate planStatus and status ones
  await sequelize.query(`
    DECLARE @sql2 NVARCHAR(MAX) = N'';
    SELECT @sql2 += 'ALTER TABLE [ProjectPlans] DROP CONSTRAINT [' + cc.name + '];'
    FROM sys.check_constraints cc
    WHERE cc.parent_object_id = OBJECT_ID(N'ProjectPlans');
    IF LEN(@sql2) > 0 EXEC sp_executesql @sql2;
  `);
  const planStatusValues = Object.values(PlanStatus).map((v) => `'${v}'`).join(', ');
  const projectPlanStatusValues = Object.values(ProjectPlanStatus).map((v) => `'${v}'`).join(', ');
  await sequelize.query(`
    ALTER TABLE [ProjectPlans] WITH NOCHECK ADD CONSTRAINT [ProjectPlans_planStatus_chk]
      CHECK ([planStatus] IN (${planStatusValues}))
  `);
  await sequelize.query(`
    ALTER TABLE [ProjectPlans] WITH NOCHECK ADD CONSTRAINT [ProjectPlans_status_chk]
      CHECK ([status] IN (${projectPlanStatusValues}))
  `);
  console.log('[Migrate] ProjectPlans ENUM constraints updated.');
};

// Migrate role CHECK constraint to include all current UserRole values.
// Drops ALL check constraints on Users then recreates the role one.
const migrateRoleConstraint = async (): Promise<void> => {
  const roleValues = Object.values(UserRole).map((v) => `'${v}'`).join(', ');

  const userRows = await sequelize.query<{ name: string }>(`
    SELECT cc.name
    FROM sys.check_constraints cc
    WHERE cc.parent_object_id = OBJECT_ID(N'Users')
  `, { type: QueryTypes.SELECT });

  for (const row of userRows) {
    try {
      await sequelize.query(`ALTER TABLE [Users] DROP CONSTRAINT [${row.name}]`);
    } catch (e) {
      console.warn(`[Migrate] Could not drop Users constraint [${row.name}]:`, e);
    }
  }

  await sequelize.query(`
    ALTER TABLE [Users] WITH NOCHECK ADD CONSTRAINT [Users_role_chk]
      CHECK ([role] IN (${roleValues}))
  `);
  console.log('[Migrate] Role CHECK constraint updated.');
};

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    console.log('[Migrate] Syncing database schema...');
    await retry(
      async () => {
        await sequelize.sync({ alter: !isProduction });
        await migrateMissingColumns();
        await migrateSipProjectConstraints();
        await migrateProjectTrackingConstraints();
        await migrateRoleConstraint();
      },
      {
        attempts: parseInt(process.env.DB_STARTUP_RETRIES || '3', 10),
        initialDelayMs: 2000,
        maxDelayMs: 15000,
        backoffMultiplier: 2,
        jitterRatio: 0.2,
        shouldRetry: isLikelyTransientSqlError,
        onRetry: ({ attempt, delayMs, error }) => {
          console.warn(
            `[Migrate] Startup DB step failed on attempt ${attempt}. Retrying in ${delayMs}ms...`,
            (error as { message?: string })?.message || error
          );
        },
      }
    );
    console.log('[Migrate] Database schema synchronised successfully.');

    // Bootstrap admin user if it doesn't exist yet
    const [, created] = await User.findOrCreate({
      where: { email: 'admin@yourorganisation.com' },
      defaults: {
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@yourorganisation.com',
        passwordHash: 'Admin@123456',
        role: UserRole.ADMIN,
      },
    });
    if (created) {
      console.log('[Seed] Admin user created: admin@yourorganisation.com');
      console.log('[Seed] IMPORTANT: Change the default password after first login!');
    }

    app.listen(PORT, () => {
      console.log(`[Server] Work Programme API running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
};

startServer();

// ─────────────────────────────────────────────────────────────────────────────
// Daily cron – check for projects starting today & send monthly status requests
// Runs at 08:00 every day.
// ─────────────────────────────────────────────────────────────────────────────
const scheduleDaily = (hour: number, minute: number, task: () => Promise<void>) => {
  const msUntilNext = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.getTime() - now.getTime();
  };
  const run = async () => {
    try {
      await task();
    } catch (e) {
      console.error('[Cron] Task error:', e);
    }
    setTimeout(run, msUntilNext());
  };
  setTimeout(run, msUntilNext());
};

const runDailyProjectChecks = async () => {
  console.log('[Cron] Running daily project checks…');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Find plan_complete projects whose plan start date is today → activate them
  const plansStartingToday = await ProjectPlan.findAll({
    where: {
      timelineStart: { [Op.gte]: today, [Op.lt]: tomorrow },
    },
    include: [
      {
        model: SipProject,
        as: 'sipProject',
        where: { status: SipProjectStatus.PLAN_COMPLETE },
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name', 'contactEmail'] },
          { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      },
    ],
  });

  for (const plan of plansStartingToday) {
    const project = (plan as any).sipProject as any;
    if (!project) continue;
    if (project.startNotificationSentAt) continue; // already sent

    await project.update({
      status: SipProjectStatus.ACTIVE,
      activeStartDate: new Date(),
      startNotificationSentAt: new Date(),
    });

    const dept = project.department;
    const creator = project.createdBy;

    // Email cyber team
    const cyberUsers = await User.findAll({
      where: { role: [UserRole.CYBER, UserRole.ADMIN], isActive: true },
      attributes: ['email', 'firstName', 'lastName'],
    });
    for (const cu of cyberUsers as any[]) {
      await sendProjectStartEmail({
        toEmail: cu.email,
        recipientName: `${cu.firstName} ${cu.lastName}`,
        improvementTitle: project.improvementTitle,
        departmentName: dept?.name || 'Unknown',
        projectId: project.id,
      });
    }

    // Email the project creator/team
    if (creator) {
      await sendProjectStartEmail({
        toEmail: creator.email,
        recipientName: `${creator.firstName} ${creator.lastName}`,
        improvementTitle: project.improvementTitle,
        departmentName: dept?.name || 'Unknown',
        projectId: project.id,
      });
    }
    if (dept?.contactEmail && dept.contactEmail !== creator?.email) {
      await sendProjectStartEmail({
        toEmail: dept.contactEmail,
        recipientName: 'Team',
        improvementTitle: project.improvementTitle,
        departmentName: dept?.name || 'Unknown',
        projectId: project.id,
      });
    }

    console.log(`[Cron] Activated project ${project.id}: ${project.improvementTitle}`);
  }

  // 2. Monthly status update requests – send on the 1st of each month
  if (today.getDate() === 1) {
    const activeProjects = await SipProject.findAll({
      where: { status: SipProjectStatus.ACTIVE },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'contactEmail'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    for (const project of activeProjects as any[]) {
      const dept = project.department;
      const creator = project.createdBy;

      if (creator) {
        await sendMonthlyStatusRequestEmail({
          toEmail: creator.email,
          recipientName: `${creator.firstName} ${creator.lastName}`,
          improvementTitle: project.improvementTitle,
          departmentName: dept?.name || 'Unknown',
          projectId: project.id,
        });
      }
      if (dept?.contactEmail && dept.contactEmail !== creator?.email) {
        await sendMonthlyStatusRequestEmail({
          toEmail: dept.contactEmail,
          recipientName: 'Team',
          improvementTitle: project.improvementTitle,
          departmentName: dept?.name || 'Unknown',
          projectId: project.id,
        });
      }
    }
    console.log(`[Cron] Sent monthly status requests for ${activeProjects.length} active projects.`);
  }
};

scheduleDaily(8, 0, runDailyProjectChecks);

export default app;
