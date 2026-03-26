import { Router, Request, Response, NextFunction } from 'express';
import { SipProject, ProjectStatusUpdate, ProjectPlan, Department, User } from '../models';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole, SipProjectStatus, ProjectTrackingStatus, SipPriority, PlanStatus } from '../types';
import { Op, fn, col, where } from 'sequelize';

const router = Router();
router.use(authenticate);

// GET /api/dashboard/cyber-stats – project portfolio overview for Cyber team
router.get(
  '/cyber-stats',
  authorize(UserRole.CYBER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Released: closed and verified
      const released = await SipProject.count({ where: { status: SipProjectStatus.CLOSED_VERIFIED } });

      // Feasibility: projects in any feasibility stage
      const feasibilityStatuses = [
        SipProjectStatus.APPROVED,
        SipProjectStatus.UNDER_REVIEW,
        SipProjectStatus.FEASIBILITY_ASSESSMENT,
        SipProjectStatus.FEASIBILITY_ACCEPTED,
      ];
      const feasibility = await SipProject.count({ where: { status: feasibilityStatuses } });

      // Planning: projects in any planning stage
      const planningStatuses = [
        SipProjectStatus.IN_PLANNING,
        SipProjectStatus.PLAN_SUBMITTED,
        SipProjectStatus.PLAN_DIRECTOR_APPROVED,
        SipProjectStatus.PLAN_COMPLETE,
      ];
      const planning = await SipProject.count({ where: { status: planningStatuses } });

      // Active
      const active = await SipProject.count({ where: { status: SipProjectStatus.ACTIVE } });

      // Non-implementing
      const nonImplementing = await SipProject.count({ where: { status: SipProjectStatus.NON_IMPLEMENTING } });

      // On hold: active projects whose most recent status update is 'on_hold'
      const activeProjects = await SipProject.findAll({
        where: { status: SipProjectStatus.ACTIVE },
        attributes: ['id'],
        include: [
          {
            model: ProjectStatusUpdate,
            as: 'statusUpdates',
            attributes: ['status'],
            separate: true,
            order: [['submittedAt', 'DESC']],
            limit: 1,
          },
        ],
      });
      const onHold = activeProjects.filter((p) => {
        const updates = (p as any).statusUpdates as ProjectStatusUpdate[];
        return updates && updates.length > 0 && updates[0].status === ProjectTrackingStatus.ON_HOLD;
      }).length;

      // Start date amended: plans where startDateAmended = true
      const startDateAmended = await ProjectPlan.count({ where: { startDateAmended: true } });

      // Amended projects detail list
      const amendedPlans = await ProjectPlan.findAll({
        where: { startDateAmended: true },
        attributes: ['sipProjectId', 'timelineStart', 'timelineEnd'],
        include: [
          {
            model: SipProject,
            as: 'sipProject',
            attributes: ['id', 'improvementTitle', 'status', 'priority'],
            include: [
              { model: Department, as: 'department', attributes: ['name'] },
            ],
          },
        ],
      });
      const amendedProjectsList = amendedPlans.map((plan: any) => ({
        id: plan.sipProject?.id,
        title: plan.sipProject?.improvementTitle || 'Unknown',
        department: plan.sipProject?.department?.name || 'Unknown',
        status: plan.sipProject?.status || 'unknown',
        priority: plan.sipProject?.priority || 'unknown',
        timelineStart: plan.timelineStart,
        timelineEnd: plan.timelineEnd,
      }));

      // Department breakdown for active pipeline projects
      const allTrackedStatuses = [
        ...feasibilityStatuses,
        ...planningStatuses,
        SipProjectStatus.ACTIVE,
        SipProjectStatus.NON_IMPLEMENTING,
        SipProjectStatus.CLOSED_VERIFIED,
      ];
      const deptProjects = await SipProject.findAll({
        where: { status: allTrackedStatuses },
        attributes: ['departmentId', 'status'],
        include: [
          { model: Department, as: 'department', attributes: ['name'] },
        ],
      });

      const deptMap: Record<string, {
        name: string;
        feasibility: number;
        planning: number;
        active: number;
        nonImplementing: number;
        released: number;
      }> = {};

      for (const proj of deptProjects as any[]) {
        const deptId = proj.departmentId;
        const deptName = proj.department?.name || 'Unknown';
        if (!deptMap[deptId]) {
          deptMap[deptId] = { name: deptName, feasibility: 0, planning: 0, active: 0, nonImplementing: 0, released: 0 };
        }
        if (feasibilityStatuses.includes(proj.status)) deptMap[deptId].feasibility++;
        else if (planningStatuses.includes(proj.status)) deptMap[deptId].planning++;
        else if (proj.status === SipProjectStatus.ACTIVE) deptMap[deptId].active++;
        else if (proj.status === SipProjectStatus.NON_IMPLEMENTING) deptMap[deptId].nonImplementing++;
        else if (proj.status === SipProjectStatus.CLOSED_VERIFIED) deptMap[deptId].released++;
      }

      const departmentBreakdown = Object.values(deptMap).sort((a, b) => {
        const totalA = a.feasibility + a.planning + a.active + a.nonImplementing + a.released;
        const totalB = b.feasibility + b.planning + b.active + b.nonImplementing + b.released;
        return totalB - totalA;
      });

      // Priority breakdown for in-flight projects (feasibility + planning + active)
      const inFlightStatuses = [...feasibilityStatuses, ...planningStatuses, SipProjectStatus.ACTIVE];
      const [p1, p2, p3, p4] = await Promise.all([
        SipProject.count({ where: { priority: SipPriority.P1, status: inFlightStatuses } }),
        SipProject.count({ where: { priority: SipPriority.P2, status: inFlightStatuses } }),
        SipProject.count({ where: { priority: SipPriority.P3, status: inFlightStatuses } }),
        SipProject.count({ where: { priority: SipPriority.P4, status: inFlightStatuses } }),
      ]);

      res.json({
        success: true,
        data: {
          released,
          feasibility,
          planning,
          active,
          nonImplementing,
          onHold,
          startDateAmended,
          amendedProjectsList,
          departmentBreakdown,
          priorityBreakdown: { p1, p2, p3, p4 },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/dashboard/project-owner-stats – projects assigned to the logged-in user as project owner
router.get(
  '/project-owner-stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, email: userEmail } = req.user!;

      const planningStatuses = [
        SipProjectStatus.FEASIBILITY_ACCEPTED,
        SipProjectStatus.IN_PLANNING,
        SipProjectStatus.PLAN_SUBMITTED,
        SipProjectStatus.PLAN_DIRECTOR_APPROVED,
        SipProjectStatus.PLAN_COMPLETE,
      ];
      const feasibilityStatuses = [
        SipProjectStatus.APPROVED,
        SipProjectStatus.UNDER_REVIEW,
        SipProjectStatus.FEASIBILITY_ASSESSMENT,
      ];

      // Fetch the user's full name so we can match projectOwner by name
      // (the form stores a display name, not an email, in the projectOwner field)
      const userRecord = await User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
      const userFullName = userRecord
        ? `${(userRecord as any).firstName} ${(userRecord as any).lastName}`.toLowerCase()
        : null;

      const ownerConditions: any[] = [
        where(fn('LOWER', col('projectOwner')), userEmail.toLowerCase()),
        where(fn('LOWER', col('assignedToEmail')), userEmail.toLowerCase()),
      ];
      if (userFullName) {
        ownerConditions.push(where(fn('LOWER', col('projectOwner')), userFullName));
      }

      // Find all project plans where this user is listed as project owner
      const ownerPlans = await ProjectPlan.findAll({
        where: { [Op.or]: ownerConditions },
        attributes: ['sipProjectId', 'planStatus', 'timelineStart', 'timelineEnd'],
        include: [
          {
            model: SipProject,
            as: 'sipProject',
            attributes: ['id', 'improvementTitle', 'priority', 'status', 'activeStartDate'],
            include: [
              { model: Department, as: 'department', attributes: ['name'] },
              {
                model: ProjectStatusUpdate,
                as: 'statusUpdates',
                attributes: ['status', 'submittedAt'],
                separate: true,
                order: [['submittedAt', 'DESC']],
                limit: 1,
              },
            ],
          },
        ],
      });

      const assignedProjectsMap = new Map<string, any>();
      const planningProjects: object[] = [];
      const activeProjects: object[] = [];

      for (const plan of ownerPlans as any[]) {
        const proj = plan.sipProject;
        if (!proj) continue;

        const base = {
          id: proj.id,
          title: proj.improvementTitle,
          priority: proj.priority,
          status: proj.status,
          department: proj.department?.name || 'Unknown',
          timelineStart: plan.timelineStart,
          timelineEnd: plan.timelineEnd,
          planStatus: plan.planStatus,
        };

        assignedProjectsMap.set(proj.id, base);

        if (planningStatuses.includes(proj.status)) {
          planningProjects.push(base);
        } else if (proj.status === SipProjectStatus.ACTIVE) {
          const latestUpdate = (proj.statusUpdates as ProjectStatusUpdate[] | undefined)?.[0];
          activeProjects.push({
            ...base,
            activeStartDate: proj.activeStartDate,
            latestTrackingStatus: latestUpdate?.status || null,
          });
        }
      }

      // Include feasibility-stage projects created by this owner. These projects
      // can exist before any project plan is created, so they won't appear in
      // ProjectPlan ownership queries yet.
      const ownerFeasibilityProjects = await SipProject.findAll({
        where: {
          createdById: userId,
          status: { [Op.in]: feasibilityStatuses },
        },
        attributes: ['id', 'improvementTitle', 'priority', 'status'],
        include: [
          { model: Department, as: 'department', attributes: ['name'] },
        ],
      });

      for (const proj of ownerFeasibilityProjects as any[]) {
        if (assignedProjectsMap.has(proj.id)) continue;
        assignedProjectsMap.set(proj.id, {
          id: proj.id,
          title: proj.improvementTitle,
          priority: proj.priority,
          status: proj.status,
          department: proj.department?.name || 'Unknown',
          timelineStart: null,
          timelineEnd: null,
          planStatus: null,
        });
      }

      res.json({
        success: true,
        data: {
          planningCount: planningProjects.length,
          activeCount: activeProjects.length,
          assignedCount: assignedProjectsMap.size,
          assigned: Array.from(assignedProjectsMap.values()),
          planning: planningProjects,
          active: activeProjects,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/dashboard/director-unified-stats
// Director dashboard: same structure as unified-stats but scoped to the director's department.
// If the director has no departmentId set, falls back to showing all projects.
router.get(
  '/director-unified-stats',
  authorize(UserRole.DIRECTOR, UserRole.DIRECTOR_HEAD_OF, UserRole.ADMIN, UserRole.PROGRAMME_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, role } = req.user!;

      // Fetch the director's departmentId from the database
      const directorUser = await User.findByPk(userId, { attributes: ['departmentId'] });
      const directorDeptId: string | null = (directorUser as any)?.departmentId ?? null;

      const isDirectorRole = role === UserRole.DIRECTOR || role === UserRole.DIRECTOR_HEAD_OF;
      const enforceDepartmentScope = isDirectorRole;

      // Build WHERE clause: directors are always department-scoped.
      // Admin/programme manager can still see all departments via this view.
      const buildWhereWithIds = (statuses: SipProjectStatus[]) => {
        const base: any = { status: { [Op.in]: statuses } };
        if (enforceDepartmentScope) {
          if (!directorDeptId) return { ...base, departmentId: '__NO_DEPARTMENT__' };
          return { ...base, departmentId: directorDeptId };
        }
        if (directorDeptId) base.departmentId = directorDeptId;
        return base;
      };

      const baseIncludes: any[] = [
        { model: Department, as: 'department', attributes: ['name'] },
      ];

      const includesWithTracking: any[] = [
        ...baseIncludes,
        {
          model: ProjectStatusUpdate,
          as: 'statusUpdates',
          attributes: ['status', 'submittedAt'],
          separate: true,
          order: [['submittedAt', 'DESC']],
          limit: 1,
        },
        {
          model: ProjectPlan,
          as: 'projectPlan',
          attributes: ['timelineStart', 'timelineEnd', 'planStatus'],
          required: false,
        },
      ];

      const projectSummary = (p: any) => ({
        id: p.id,
        title: p.improvementTitle,
        department: p.department?.name || 'Unknown',
        priority: p.priority,
        status: p.status,
        timelineStart: p.projectPlan?.timelineStart ?? null,
        timelineEnd: p.projectPlan?.timelineEnd ?? null,
        latestTracking: p.statusUpdates?.[0]?.status ?? null,
        planStatus: p.projectPlan?.planStatus ?? null,
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // ── AGREED PROJECTS ───────────────────────────────────────────────────────
      const agreedStatuses = [
        SipProjectStatus.ACTIVE,
        SipProjectStatus.PROJECT_COMPLETE,
        SipProjectStatus.CLOSED_VERIFIED,
      ];

      const agreedProjects = await SipProject.findAll({
        where: buildWhereWithIds(agreedStatuses),
        include: includesWithTracking,
        order: [['updatedAt', 'DESC']],
      });

      const overdue: any[] = [];
      const delayed: any[] = [];
      const notStarted: any[] = [];
      const onTrack: any[] = [];
      const completed: any[] = [];

      for (const proj of agreedProjects as any[]) {
        const tracking = proj.statusUpdates?.[0]?.status as ProjectTrackingStatus | undefined;
        const endDate = proj.projectPlan?.timelineEnd ? new Date(proj.projectPlan.timelineEnd) : null;
        const summary = projectSummary(proj);

        if (proj.status === SipProjectStatus.PROJECT_COMPLETE || proj.status === SipProjectStatus.CLOSED_VERIFIED) {
          completed.push(summary);
          continue;
        }

        const isOverdue = endDate !== null && endDate < today && proj.status === SipProjectStatus.ACTIVE;

        if (isOverdue) {
          overdue.push(summary);
        } else if (
          tracking === ProjectTrackingStatus.DELAYED ||
          tracking === ProjectTrackingStatus.BLOCKED ||
          tracking === ProjectTrackingStatus.ESCALATION_NEEDED
        ) {
          delayed.push(summary);
        } else if (!tracking || tracking === ProjectTrackingStatus.NOT_STARTED) {
          notStarted.push(summary);
        } else {
          onTrack.push(summary);
        }
      }

      // ── PIPELINE STAGES ───────────────────────────────────────────────────────
      const pipelineIncludes: any[] = [
        ...baseIncludes,
        {
          model: ProjectPlan,
          as: 'projectPlan',
          attributes: ['timelineStart', 'timelineEnd', 'planStatus'],
          required: false,
        },
      ];

      const fetchStage = async (statuses: SipProjectStatus[]) => {
        const projects = await SipProject.findAll({
          where: buildWhereWithIds(statuses),
          include: pipelineIncludes,
          order: [['updatedAt', 'DESC']],
        });
        return (projects as any[]).map(projectSummary);
      };

      const [
        waitingDirectorApproval,
        waitingFeasibility,
        waitingDirectorFeasibility,
        waitingCyberFeasibility,
        waitingPlanning,
        waitingDirectorPlanApproval,
        waitingCyberPlanApproval,
        planCompleteProjects,
      ] = await Promise.all([
        fetchStage([SipProjectStatus.NEW]),
        fetchStage([SipProjectStatus.APPROVED, SipProjectStatus.FEASIBILITY_ASSESSMENT]),
        fetchStage([SipProjectStatus.UNDER_REVIEW]),
        fetchStage([SipProjectStatus.FEASIBILITY_REJECTED]),
        fetchStage([SipProjectStatus.FEASIBILITY_ACCEPTED, SipProjectStatus.IN_PLANNING]),
        fetchStage([SipProjectStatus.PLAN_SUBMITTED]),
        fetchStage([SipProjectStatus.PLAN_DIRECTOR_APPROVED]),
        fetchStage([SipProjectStatus.PLAN_COMPLETE]),
      ]);

      const waitingBudgetApproval = planCompleteProjects.filter(
        (p) => p.planStatus === PlanStatus.AWAITING_BUDGET_APPROVAL
      );
      const approvedProjects = planCompleteProjects.filter(
        (p) => p.planStatus !== PlanStatus.AWAITING_BUDGET_APPROVAL
      );

      // Resolve the department name for the response header
      let departmentName: string | null = null;
      if (directorDeptId) {
        const dept = await Department.findByPk(directorDeptId, { attributes: ['name'] });
        departmentName = (dept as any)?.name ?? null;
      }

      res.json({
        success: true,
        data: {
          departmentName,
          agreedStats: {
            overdue: { count: overdue.length, projects: overdue },
            delayed: { count: delayed.length, projects: delayed },
            notStarted: { count: notStarted.length, projects: notStarted },
            onTrack: { count: onTrack.length, projects: onTrack },
            completed: { count: completed.length, projects: completed },
          },
          pipelineStats: {
            waitingDirectorApproval: { count: waitingDirectorApproval.length, projects: waitingDirectorApproval },
            waitingFeasibility: { count: waitingFeasibility.length, projects: waitingFeasibility },
            waitingDirectorFeasibility: { count: waitingDirectorFeasibility.length, projects: waitingDirectorFeasibility },
            waitingCyberFeasibility: { count: waitingCyberFeasibility.length, projects: waitingCyberFeasibility },
            waitingPlanning: { count: waitingPlanning.length, projects: waitingPlanning },
            waitingDirectorPlanApproval: { count: waitingDirectorPlanApproval.length, projects: waitingDirectorPlanApproval },
            waitingCyberPlanApproval: { count: waitingCyberPlanApproval.length, projects: waitingCyberPlanApproval },
            waitingBudgetApproval: { count: waitingBudgetApproval.length, projects: waitingBudgetApproval },
            approvedProjects: { count: approvedProjects.length, projects: approvedProjects },
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/dashboard/project-manager-stats
// Project Manager dashboard: same structure as director-unified-stats but scoped to the PM's department.
router.get(
  '/project-manager-stats',
  authorize(UserRole.PROJECT_MANAGER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;

      // Fetch the project manager's departmentId from the database
      const pmUser = await User.findByPk(userId, { attributes: ['departmentId'] });
      const pmDeptId: string | null = (pmUser as any)?.departmentId ?? null;

      const buildWhereWithIds = (statuses: SipProjectStatus[]) => {
        const base: any = { status: { [Op.in]: statuses } };
        if (pmDeptId) base.departmentId = pmDeptId;
        return base;
      };

      const baseIncludes: any[] = [
        { model: Department, as: 'department', attributes: ['name'] },
      ];

      const includesWithTracking: any[] = [
        ...baseIncludes,
        {
          model: ProjectStatusUpdate,
          as: 'statusUpdates',
          attributes: ['status', 'submittedAt'],
          separate: true,
          order: [['submittedAt', 'DESC']],
          limit: 1,
        },
        {
          model: ProjectPlan,
          as: 'projectPlan',
          attributes: ['timelineStart', 'timelineEnd', 'planStatus'],
          required: false,
        },
      ];

      const projectSummary = (p: any) => ({
        id: p.id,
        title: p.improvementTitle,
        department: p.department?.name || 'Unknown',
        priority: p.priority,
        status: p.status,
        timelineStart: p.projectPlan?.timelineStart ?? null,
        timelineEnd: p.projectPlan?.timelineEnd ?? null,
        latestTracking: p.statusUpdates?.[0]?.status ?? null,
        planStatus: p.projectPlan?.planStatus ?? null,
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // ── AGREED PROJECTS ───────────────────────────────────────────────────────
      const agreedStatuses = [
        SipProjectStatus.ACTIVE,
        SipProjectStatus.PROJECT_COMPLETE,
        SipProjectStatus.CLOSED_VERIFIED,
      ];

      const agreedProjects = await SipProject.findAll({
        where: buildWhereWithIds(agreedStatuses),
        include: includesWithTracking,
        order: [['updatedAt', 'DESC']],
      });

      const overdue: any[] = [];
      const delayed: any[] = [];
      const notStarted: any[] = [];
      const onTrack: any[] = [];
      const completed: any[] = [];

      for (const proj of agreedProjects as any[]) {
        const tracking = proj.statusUpdates?.[0]?.status as ProjectTrackingStatus | undefined;
        const endDate = proj.projectPlan?.timelineEnd ? new Date(proj.projectPlan.timelineEnd) : null;
        const summary = projectSummary(proj);

        if (proj.status === SipProjectStatus.PROJECT_COMPLETE || proj.status === SipProjectStatus.CLOSED_VERIFIED) {
          completed.push(summary);
          continue;
        }

        const isOverdue = endDate !== null && endDate < today && proj.status === SipProjectStatus.ACTIVE;

        if (isOverdue) {
          overdue.push(summary);
        } else if (
          tracking === ProjectTrackingStatus.DELAYED ||
          tracking === ProjectTrackingStatus.BLOCKED ||
          tracking === ProjectTrackingStatus.ESCALATION_NEEDED
        ) {
          delayed.push(summary);
        } else if (!tracking || tracking === ProjectTrackingStatus.NOT_STARTED) {
          notStarted.push(summary);
        } else {
          onTrack.push(summary);
        }
      }

      // ── PIPELINE STAGES ───────────────────────────────────────────────────────
      const pipelineIncludes: any[] = [
        ...baseIncludes,
        {
          model: ProjectPlan,
          as: 'projectPlan',
          attributes: ['timelineStart', 'timelineEnd', 'planStatus'],
          required: false,
        },
      ];

      const fetchStage = async (statuses: SipProjectStatus[]) => {
        const projects = await SipProject.findAll({
          where: buildWhereWithIds(statuses),
          include: pipelineIncludes,
          order: [['updatedAt', 'DESC']],
        });
        return (projects as any[]).map(projectSummary);
      };

      const [
        waitingDirectorApproval,
        waitingFeasibility,
        waitingDirectorFeasibility,
        waitingCyberFeasibility,
        waitingPlanning,
        waitingDirectorPlanApproval,
        waitingCyberPlanApproval,
        planCompleteProjects,
      ] = await Promise.all([
        fetchStage([SipProjectStatus.NEW]),
        fetchStage([SipProjectStatus.APPROVED, SipProjectStatus.FEASIBILITY_ASSESSMENT]),
        fetchStage([SipProjectStatus.UNDER_REVIEW]),
        fetchStage([SipProjectStatus.FEASIBILITY_REJECTED]),
        fetchStage([SipProjectStatus.FEASIBILITY_ACCEPTED, SipProjectStatus.IN_PLANNING]),
        fetchStage([SipProjectStatus.PLAN_SUBMITTED]),
        fetchStage([SipProjectStatus.PLAN_DIRECTOR_APPROVED]),
        fetchStage([SipProjectStatus.PLAN_COMPLETE]),
      ]);

      const waitingBudgetApproval = planCompleteProjects.filter(
        (p) => p.planStatus === PlanStatus.AWAITING_BUDGET_APPROVAL
      );
      const approvedProjects = planCompleteProjects.filter(
        (p) => p.planStatus !== PlanStatus.AWAITING_BUDGET_APPROVAL
      );

      let departmentName: string | null = null;
      if (pmDeptId) {
        const dept = await Department.findByPk(pmDeptId, { attributes: ['name'] });
        departmentName = (dept as any)?.name ?? null;
      }

      res.json({
        success: true,
        data: {
          departmentName,
          agreedStats: {
            overdue: { count: overdue.length, projects: overdue },
            delayed: { count: delayed.length, projects: delayed },
            notStarted: { count: notStarted.length, projects: notStarted },
            onTrack: { count: onTrack.length, projects: onTrack },
            completed: { count: completed.length, projects: completed },
          },
          pipelineStats: {
            waitingDirectorApproval: { count: waitingDirectorApproval.length, projects: waitingDirectorApproval },
            waitingFeasibility: { count: waitingFeasibility.length, projects: waitingFeasibility },
            waitingDirectorFeasibility: { count: waitingDirectorFeasibility.length, projects: waitingDirectorFeasibility },
            waitingCyberFeasibility: { count: waitingCyberFeasibility.length, projects: waitingCyberFeasibility },
            waitingPlanning: { count: waitingPlanning.length, projects: waitingPlanning },
            waitingDirectorPlanApproval: { count: waitingDirectorPlanApproval.length, projects: waitingDirectorPlanApproval },
            waitingCyberPlanApproval: { count: waitingCyberPlanApproval.length, projects: waitingCyberPlanApproval },
            waitingBudgetApproval: { count: waitingBudgetApproval.length, projects: waitingBudgetApproval },
            approvedProjects: { count: approvedProjects.length, projects: approvedProjects },
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/dashboard/unified-stats
// Universal dashboard stats: agreed-project tracking + pipeline stages, filtered by user relevance
router.get('/unified-stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role, email } = req.user!;

    // Determine scope: privileged roles see everything.
    // Non-privileged users see projects they created, plus projects where they are
    // explicitly assigned in planning (project owner / assigned to email).
    const isPrivileged =
      role === UserRole.ADMIN ||
      role === UserRole.DIRECTOR ||
      role === UserRole.DIRECTOR_HEAD_OF ||
      role === UserRole.PROGRAMME_MANAGER ||
      role === UserRole.CYBER;

    // Fetch the user's name so we can match projectOwner by display name
    // (the form stores a name, not an email).
    const userRecord = await User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
    const userFullName = userRecord
      ? `${(userRecord as any).firstName} ${(userRecord as any).lastName}`.toLowerCase()
      : null;

    // Pre-fetch the sipProjectIds where the user is linked on the plan so we can
    // reuse them when scoping non-privileged dashboard data.
    let linkedPlanProjectIds: string[] = [];
    if (!isPrivileged) {
      const ownerConditions: any[] = [
        where(fn('LOWER', col('projectOwner')), email.toLowerCase()),
        where(fn('LOWER', col('assignedToEmail')), email.toLowerCase()),
      ];
      // projectOwner field can store a display name (e.g. "Jane Smith") rather than
      // an email address when entered via the planning form, so also match by full name.
      if (userFullName) {
        ownerConditions.push(where(fn('LOWER', col('projectOwner')), userFullName));
      }

      const linkedPlans = await ProjectPlan.findAll({
        where: { [Op.or]: ownerConditions },
        attributes: ['sipProjectId'],
      });
      linkedPlanProjectIds = linkedPlans
        .map((p: any) => p.sipProjectId)
        .filter((id: unknown): id is string => typeof id === 'string');
    }

    const buildWhereWithIds = (statuses: SipProjectStatus[]) => {
      if (isPrivileged) return { status: { [Op.in]: statuses } };

      if (linkedPlanProjectIds.length > 0) {
        return {
          status: { [Op.in]: statuses },
          [Op.or]: [
            { id: { [Op.in]: linkedPlanProjectIds } },
            { createdById: userId },
          ],
        };
      }
      return { status: { [Op.in]: statuses }, createdById: userId };
    };

    // ── Common includes ───────────────────────────────────────────────────────
    const baseIncludes: any[] = [
      { model: Department, as: 'department', attributes: ['name'] },
    ];

    const includesWithTracking: any[] = [
      ...baseIncludes,
      {
        model: ProjectStatusUpdate,
        as: 'statusUpdates',
        attributes: ['status', 'submittedAt'],
        separate: true,
        order: [['submittedAt', 'DESC']],
        limit: 1,
      },
      {
        model: ProjectPlan,
        as: 'projectPlan',
        attributes: ['timelineStart', 'timelineEnd', 'planStatus'],
        required: false,
      },
    ];

    const projectSummary = (p: any) => ({
      id: p.id,
      title: p.improvementTitle,
      department: p.department?.name || 'Unknown',
      priority: p.priority,
      status: p.status,
      timelineStart: p.projectPlan?.timelineStart ?? null,
      timelineEnd: p.projectPlan?.timelineEnd ?? null,
      latestTracking: p.statusUpdates?.[0]?.status ?? null,
      planStatus: p.projectPlan?.planStatus ?? null,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ── AGREED PROJECTS (active tracking stage) ───────────────────────────────
    const agreedStatuses = [
      SipProjectStatus.ACTIVE,
      SipProjectStatus.PROJECT_COMPLETE,
      SipProjectStatus.CLOSED_VERIFIED,
    ];

    const agreedProjects = await SipProject.findAll({
      where: buildWhereWithIds(agreedStatuses),
      include: includesWithTracking,
      order: [['updatedAt', 'DESC']],
    });

    const overdue: any[] = [];
    const delayed: any[] = [];
    const notStarted: any[] = [];
    const onTrack: any[] = [];
    const completed: any[] = [];

    for (const proj of agreedProjects as any[]) {
      const tracking = proj.statusUpdates?.[0]?.status as ProjectTrackingStatus | undefined;
      const endDate = proj.projectPlan?.timelineEnd ? new Date(proj.projectPlan.timelineEnd) : null;
      const summary = projectSummary(proj);

      if (proj.status === SipProjectStatus.PROJECT_COMPLETE || proj.status === SipProjectStatus.CLOSED_VERIFIED) {
        completed.push(summary);
        continue;
      }

      // Active projects: categorise by tracking status and timeline
      const isOverdue = endDate !== null && endDate < today && proj.status === SipProjectStatus.ACTIVE;

      if (isOverdue) {
        overdue.push(summary);
      } else if (
        tracking === ProjectTrackingStatus.DELAYED ||
        tracking === ProjectTrackingStatus.BLOCKED ||
        tracking === ProjectTrackingStatus.ESCALATION_NEEDED
      ) {
        delayed.push(summary);
      } else if (!tracking || tracking === ProjectTrackingStatus.NOT_STARTED) {
        notStarted.push(summary);
      } else {
        // on_track, started, in_planning, on_hold all go here
        onTrack.push(summary);
      }
    }

    // ── PIPELINE STAGES (unagreed projects) ───────────────────────────────────
    const pipelineIncludes: any[] = [
      ...baseIncludes,
      {
        model: ProjectPlan,
        as: 'projectPlan',
        attributes: ['timelineStart', 'timelineEnd', 'planStatus'],
        required: false,
      },
    ];

    const fetchStage = async (statuses: SipProjectStatus[]) => {
      const projects = await SipProject.findAll({
        where: buildWhereWithIds(statuses),
        include: pipelineIncludes,
        order: [['updatedAt', 'DESC']],
      });
      return (projects as any[]).map(projectSummary);
    };

    const waitingFeasibilityStatuses = [
      SipProjectStatus.APPROVED,
      SipProjectStatus.FEASIBILITY_ASSESSMENT,
    ];

    const waitingDirectorFeasibilityStatuses = [SipProjectStatus.UNDER_REVIEW];

    const [
      waitingDirectorApproval,
      waitingFeasibility,
      waitingDirectorFeasibility,
      waitingCyberFeasibility,
      waitingPlanning,
      waitingDirectorPlanApproval,
      waitingCyberPlanApproval,
      planCompleteProjects,
    ] = await Promise.all([
      fetchStage([SipProjectStatus.NEW]),
      fetchStage(waitingFeasibilityStatuses),
      fetchStage(waitingDirectorFeasibilityStatuses),
      fetchStage([SipProjectStatus.FEASIBILITY_REJECTED]),
      fetchStage([SipProjectStatus.FEASIBILITY_ACCEPTED, SipProjectStatus.IN_PLANNING]),
      fetchStage([SipProjectStatus.PLAN_SUBMITTED]),
      fetchStage([SipProjectStatus.PLAN_DIRECTOR_APPROVED]),
      fetchStage([SipProjectStatus.PLAN_COMPLETE]),
    ]);

    // Split plan_complete into budget-waiting vs approved/ready
    const waitingBudgetApproval = planCompleteProjects.filter(
      (p) => p.planStatus === PlanStatus.AWAITING_BUDGET_APPROVAL
    );
    const approvedProjects = planCompleteProjects.filter(
      (p) => p.planStatus !== PlanStatus.AWAITING_BUDGET_APPROVAL
    );

    res.json({
      success: true,
      data: {
        agreedStats: {
          overdue: { count: overdue.length, projects: overdue },
          delayed: { count: delayed.length, projects: delayed },
          notStarted: { count: notStarted.length, projects: notStarted },
          onTrack: { count: onTrack.length, projects: onTrack },
          completed: { count: completed.length, projects: completed },
        },
        pipelineStats: {
          waitingDirectorApproval: { count: waitingDirectorApproval.length, projects: waitingDirectorApproval },
          waitingFeasibility: { count: waitingFeasibility.length, projects: waitingFeasibility },
          waitingDirectorFeasibility: { count: waitingDirectorFeasibility.length, projects: waitingDirectorFeasibility },
          waitingCyberFeasibility: { count: waitingCyberFeasibility.length, projects: waitingCyberFeasibility },
          waitingPlanning: { count: waitingPlanning.length, projects: waitingPlanning },
          waitingDirectorPlanApproval: { count: waitingDirectorPlanApproval.length, projects: waitingDirectorPlanApproval },
          waitingCyberPlanApproval: { count: waitingCyberPlanApproval.length, projects: waitingCyberPlanApproval },
          waitingBudgetApproval: { count: waitingBudgetApproval.length, projects: waitingBudgetApproval },
          approvedProjects: { count: approvedProjects.length, projects: approvedProjects },
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/department-overview
// Full per-department security dashboard for Cyber/Admin roles
router.get(
  '/department-overview',
  authorize(UserRole.CYBER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // All departments
      const departments = await Department.findAll({
        attributes: ['id', 'name'],
        order: [['name', 'ASC']],
      });

      // Agreed projects: active, complete, closed
      const agreedStatuses = [
        SipProjectStatus.ACTIVE,
        SipProjectStatus.PROJECT_COMPLETE,
        SipProjectStatus.CLOSED_VERIFIED,
      ];

      const agreedProjects = await SipProject.findAll({
        where: { status: { [Op.in]: agreedStatuses } },
        attributes: ['id', 'departmentId', 'status'],
        include: [
          {
            model: ProjectStatusUpdate,
            as: 'statusUpdates',
            attributes: ['status'],
            separate: true,
            order: [['submittedAt', 'DESC']],
            limit: 1,
          },
          {
            model: ProjectPlan,
            as: 'projectPlan',
            attributes: ['timelineEnd'],
            required: false,
          },
        ],
      });

      // Pipeline projects (everything before active)
      const pipelineStatuses = [
        SipProjectStatus.NEW,
        SipProjectStatus.APPROVED,
        SipProjectStatus.UNDER_REVIEW,
        SipProjectStatus.FEASIBILITY_ASSESSMENT,
        SipProjectStatus.FEASIBILITY_ACCEPTED,
        SipProjectStatus.IN_PLANNING,
        SipProjectStatus.PLAN_SUBMITTED,
        SipProjectStatus.PLAN_DIRECTOR_APPROVED,
        SipProjectStatus.PLAN_COMPLETE,
        SipProjectStatus.NON_IMPLEMENTING,
      ];

      const pipelineProjects = await SipProject.findAll({
        where: { status: { [Op.in]: pipelineStatuses } },
        attributes: ['id', 'departmentId', 'status'],
      });

      // Initialise per-department counters
      type DeptStats = {
        overdue: number;
        delayed: number;
        notStarted: number;
        onTrack: number;
        completed: number;
        inPipeline: number;
        nonImplementing: number;
      };

      const deptMap: Record<string, DeptStats> = {};
      for (const dept of departments as any[]) {
        deptMap[dept.id] = {
          overdue: 0, delayed: 0, notStarted: 0,
          onTrack: 0, completed: 0, inPipeline: 0, nonImplementing: 0,
        };
      }

      // Categorise agreed projects
      for (const proj of agreedProjects as any[]) {
        const s = deptMap[proj.departmentId];
        if (!s) continue;

        if (
          proj.status === SipProjectStatus.PROJECT_COMPLETE ||
          proj.status === SipProjectStatus.CLOSED_VERIFIED
        ) {
          s.completed++;
          continue;
        }

        const tracking = proj.statusUpdates?.[0]?.status as ProjectTrackingStatus | undefined;
        const endDate = proj.projectPlan?.timelineEnd ? new Date(proj.projectPlan.timelineEnd) : null;
        const isOverdue = endDate !== null && endDate < today;

        if (isOverdue) {
          s.overdue++;
        } else if (
          tracking === ProjectTrackingStatus.DELAYED ||
          tracking === ProjectTrackingStatus.BLOCKED ||
          tracking === ProjectTrackingStatus.ESCALATION_NEEDED
        ) {
          s.delayed++;
        } else if (!tracking || tracking === ProjectTrackingStatus.NOT_STARTED) {
          s.notStarted++;
        } else {
          s.onTrack++;
        }
      }

      // Categorise pipeline projects
      for (const proj of pipelineProjects as any[]) {
        const s = deptMap[proj.departmentId];
        if (!s) continue;
        if (proj.status === SipProjectStatus.NON_IMPLEMENTING) {
          s.nonImplementing++;
        } else {
          s.inPipeline++;
        }
      }

      // Priority breakdown for in-flight projects
      const inFlightStatuses = [
        SipProjectStatus.ACTIVE,
        SipProjectStatus.APPROVED,
        SipProjectStatus.UNDER_REVIEW,
        SipProjectStatus.FEASIBILITY_ASSESSMENT,
        SipProjectStatus.FEASIBILITY_ACCEPTED,
        SipProjectStatus.IN_PLANNING,
        SipProjectStatus.PLAN_SUBMITTED,
        SipProjectStatus.PLAN_DIRECTOR_APPROVED,
        SipProjectStatus.PLAN_COMPLETE,
      ];

      const [p1, p2, p3, p4] = await Promise.all([
        SipProject.count({ where: { priority: SipPriority.P1, status: { [Op.in]: inFlightStatuses } } }),
        SipProject.count({ where: { priority: SipPriority.P2, status: { [Op.in]: inFlightStatuses } } }),
        SipProject.count({ where: { priority: SipPriority.P3, status: { [Op.in]: inFlightStatuses } } }),
        SipProject.count({ where: { priority: SipPriority.P4, status: { [Op.in]: inFlightStatuses } } }),
      ]);

      // Build per-department response
      const departmentStats = (departments as any[]).map((dept) => {
        const s = deptMap[dept.id] ?? {
          overdue: 0, delayed: 0, notStarted: 0,
          onTrack: 0, completed: 0, inPipeline: 0, nonImplementing: 0,
        };
        const total = s.overdue + s.delayed + s.notStarted + s.onTrack +
          s.completed + s.inPipeline + s.nonImplementing;
        let health: 'critical' | 'warning' | 'good' | 'empty' = 'empty';
        if (total > 0) {
          if (s.overdue > 0) health = 'critical';
          else if (s.delayed > 0) health = 'warning';
          else health = 'good';
        }
        return { id: dept.id, name: dept.name, stats: { ...s, total }, health };
      });

      // Overall summary
      const summary = departmentStats.reduce(
        (acc, d) => ({
          totalProjects: acc.totalProjects + d.stats.total,
          overdueProjects: acc.overdueProjects + d.stats.overdue,
          delayedProjects: acc.delayedProjects + d.stats.delayed,
          activeProjects:
            acc.activeProjects +
            d.stats.onTrack + d.stats.notStarted + d.stats.overdue + d.stats.delayed,
          completedProjects: acc.completedProjects + d.stats.completed,
          pipelineProjects: acc.pipelineProjects + d.stats.inPipeline,
        }),
        { totalProjects: 0, overdueProjects: 0, delayedProjects: 0, activeProjects: 0, completedProjects: 0, pipelineProjects: 0 }
      );

      res.json({
        success: true,
        data: {
          summary: { ...summary, totalDepartments: departments.length },
          departments: departmentStats,
          priorityBreakdown: { p1, p2, p3, p4 },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/dashboard/monthly-project-growth
// Returns month-by-month project creation counts (last 12 months) for waterfall chart
router.get(
  '/monthly-project-growth',
  authorize(UserRole.CYBER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();

      // Build ordered list of the last 12 months (YYYY-MM keys)
      const monthKeys: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }

      // Count of projects created before the window (for cumulative baseline)
      const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const baseline = await SipProject.count({
        where: { createdAt: { [Op.lt]: windowStart } },
      });

      // Fetch all projects created within the window
      const windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const projects = await SipProject.findAll({
        where: { createdAt: { [Op.gte]: windowStart, [Op.lt]: windowEnd } },
        attributes: ['createdAt'],
      });

      // Count per month
      const countMap: Record<string, number> = {};
      for (const key of monthKeys) countMap[key] = 0;
      for (const proj of projects as any[]) {
        const d = new Date(proj.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key in countMap) countMap[key]++;
      }

      // Build result with running cumulative total (for waterfall base)
      let running = baseline;
      const result = monthKeys.map((key) => {
        const [year, month] = key.split('-');
        const d = new Date(parseInt(year), parseInt(month) - 1, 1);
        const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        const newProjects = countMap[key];
        const base = running;
        running += newProjects;
        return { month: label, newProjects, cumulativeTotal: running, base };
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
