/**
 * Database migration script - creates all tables in Azure SQL
 * Run: npm run migrate
 */
import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase } from './config/database';
import sequelize from './config/database';
import './models'; // load all models and associations

const numericNormalisationExpr = (column: string): string =>
  `NULLIF(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CONVERT(NVARCHAR(255), [${column}]), N'£', N''), N'$', N''), N',', N''), NCHAR(160), N''), CHAR(9), N''), CHAR(13), N''), CHAR(10), N''))), N'')`;

const buildNumericCleanupSql = (table: string, column: string): string => {
  const normalised = numericNormalisationExpr(column);
  return `
    UPDATE [${table}]
    SET [${column}] = CASE
      WHEN ${normalised} IS NULL THEN NULL
      WHEN TRY_CONVERT(FLOAT, ${normalised}) IS NULL THEN NULL
      ELSE ${normalised}
    END
    WHERE [${column}] IS NOT NULL
  `;
};

const migrate = async () => {
  try {
    await connectDatabase();

    // Pre-migration: normalise legacy string cost/resource columns to numeric-safe values.
    // This must run before sync so that invalid strings don't block NVARCHAR→FLOAT casts.
    console.log('[Migrate] Running pre-migration data cleanup for numeric cost/resource fields...');

    const feasibilityColumns = [
      'setupCosts',
      'annualOngoingCost',
      'setupResources',
      'annualOngoingResources',
      'additionalResources',
    ];

    const queries = [
      ...feasibilityColumns.map((column) => buildNumericCleanupSql('FeasibilityReviews', column)),
      buildNumericCleanupSql('ProjectPlans', 'budgetAllocated'),
    ];

    for (const sql of queries) {
      try {
        await sequelize.query(sql);
      } catch {
        // Column may already be FLOAT (idempotent); safe to skip.
      }
    }
    console.log('[Migrate] Pre-migration cleanup complete.');

    console.log('[Migrate] Syncing database schema...');

    // alter:true updates schema without dropping data; use force:true only in dev
    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });

    console.log('[Migrate] Database schema synchronised successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[Migrate] Migration failed:', error);
    process.exit(1);
  }
};

migrate();
