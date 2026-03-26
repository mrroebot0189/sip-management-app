import { Router, Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { SipProject, Department, User, ProjectPlan, ProjectMilestone } from '../models';
import { authenticate, authorize } from '../middleware/auth';
import { SipProjectStatus, UserRole, PlanStatus, ProjectPlanStatus } from '../types';
import {
  sendPlanningCyberAssistanceEmail,
  sendPlanSubmittedDirectorEmail,
  sendPlanDirectorApprovedEmail,
  sendPlanCyberApprovedEmail,
  sendPlanningAssignmentEmail,
} from '../services/emailService';

const router = Router();
router.use(authenticate);

const PLANNING_STATUSES = [
  SipProjectStatus.FEASIBILITY_ACCEPTED,
  SipProjectStatus.IN_PLANNING,
  SipProjectStatus.PLAN_SUBMITTED,
  SipProjectStatus.PLAN_DIRECTOR_APPROVED,
  SipProjectStatus.PLAN_COMPLETE,
];

// Helper: rebuild milestones from keyDeliverables JSON
const syncMilestones = async (
  projectPlanId: string,
  sipProjectId: string,
  keyDeliverablesJson: string
): Promise<void> => {
  let deliverables: { title: string; details?: string; dueDate: string }[] = [];
  try {
    deliverables = JSON.parse(keyDeliverablesJson) || [];
  } catch {
    deliverables = [];
  }

  // Delete existing milestones and re-create from deliverables
  await ProjectMilestone.destroy({ where: { projectPlanId } });

  for (let i = 0; i < deliverables.length; i++) {
    const d = deliverables[i];
    if (d.title?.trim() && d.dueDate) {
      await ProjectMilestone.create({
        projectPlanId,
        sipProjectId,
        title: d.title.trim(),
        details: d.details?.trim() || undefined,
        dueDate: new Date(d.dueDate),
        status: 'pending',
        sortOrder: i,
      });
    }
  }
};

// GET /api/project-plans
// Returns projects in planning stages (visible to planning manager, directors, cyber, admin)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;

    // Admins, programme managers and cyber see everything;
    // Directors/director_head_of only see projects assigned to them;
    // all others also see only their assigned projects
    const seesAll =
      role === UserRole.ADMIN ||
      role === UserRole.PROGRAMME_MANAGER ||
      role === UserRole.CYBER;

    const projects = await SipProject.findAll({
      where: { status: { [Op.in]: PLANNING_STATUSES } },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
        {
          model: ProjectPlan,
          as: 'projectPlan',
          required: false,
          include: [
            { model: User, as: 'planManager', attributes: ['id', 'firstName', 'lastName', 'email'] },
          ],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    // Non-privileged users and directors see only projects where they are the planning manager or feasibility reviewer
    const data = seesAll
      ? projects
      : projects.filter((p) => {
          const plan = p.get('projectPlan') as ProjectPlan | null;
          return (
            p.feasibilityReviewerId?.toLowerCase() === userId.toLowerCase() ||
            p.createdById?.toLowerCase() === userId.toLowerCase() ||
            plan?.createdById?.toLowerCase() === userId.toLowerCase()
          );
        });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/project-plans/for-director-review
// Returns plans with status PLAN_SUBMITTED – awaiting director approval
router.get(
  '/for-director-review',
  authorize(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.PROGRAMME_MANAGER, UserRole.DIRECTOR_HEAD_OF),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const projects = await SipProject.findAll({
        where: { status: SipProjectStatus.PLAN_SUBMITTED },
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
          {
            model: ProjectPlan,
            as: 'projectPlan',
            required: false,
            include: [
              { model: User, as: 'planManager', attributes: ['id', 'firstName', 'lastName', 'email'] },
            ],
          },
        ],
        order: [['updatedAt', 'DESC']],
      });

      res.json({ success: true, data: projects });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/project-plans/for-cyber-review
// Returns plans with status PLAN_DIRECTOR_APPROVED – awaiting cyber approval
router.get(
  '/for-cyber-review',
  authorize(UserRole.ADMIN, UserRole.CYBER),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const projects = await SipProject.findAll({
        where: { status: SipProjectStatus.PLAN_DIRECTOR_APPROVED },
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
          {
            model: ProjectPlan,
            as: 'projectPlan',
            required: false,
            include: [
              { model: User, as: 'planManager', attributes: ['id', 'firstName', 'lastName', 'email'] },
            ],
          },
        ],
        order: [['updatedAt', 'DESC']],
      });

      res.json({ success: true, data: projects });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/project-plans/milestones/:projectId
// Returns milestones for a project
router.get('/milestones/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.user!;

    const project = await SipProject.findByPk(projectId);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    const isPrivileged =
      role === UserRole.ADMIN ||
      role === UserRole.DIRECTOR ||
      role === UserRole.PROGRAMME_MANAGER ||
      role === UserRole.DIRECTOR_HEAD_OF ||
      role === UserRole.CYBER;

    if (!isPrivileged) {
      const plan = await ProjectPlan.findOne({ where: { sipProjectId: projectId } });
      const isOwner =
        project.feasibilityReviewerId?.toLowerCase() === userId.toLowerCase() ||
        project.createdById?.toLowerCase() === userId.toLowerCase() ||
        plan?.createdById?.toLowerCase() === userId.toLowerCase();
      if (!isOwner) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }
    }

    const milestones = await ProjectMilestone.findAll({
      where: { sipProjectId: projectId },
      order: [['sortOrder', 'ASC'], ['dueDate', 'ASC']],
    });

    res.json({ success: true, data: milestones });
  } catch (err) {
    next(err);
  }
});

// PUT /api/project-plans/milestones/:milestoneId/toggle
// Toggle milestone complete/pending
router.put('/milestones/:milestoneId/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const milestone = await ProjectMilestone.findByPk(req.params['milestoneId']);
    if (!milestone) {
      res.status(404).json({ success: false, message: 'Milestone not found' });
      return;
    }

    const newStatus = milestone.status === 'completed' ? 'pending' : 'completed';
    await milestone.update({
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date() : undefined,
    });

    res.json({ success: true, data: milestone, message: `Milestone marked as ${newStatus}.` });
  } catch (err) {
    next(err);
  }
});

// GET /api/project-plans/:projectId
// Get plan data for a specific project
router.get('/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.user!;

    const project = await SipProject.findByPk(projectId, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'contactEmail'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    const isPrivileged =
      role === UserRole.ADMIN ||
      role === UserRole.DIRECTOR ||
      role === UserRole.PROGRAMME_MANAGER ||
      role === UserRole.DIRECTOR_HEAD_OF ||
      role === UserRole.CYBER;

    if (!isPrivileged) {
      const plan = await ProjectPlan.findOne({ where: { sipProjectId: projectId } });
      const isOwner =
        project.feasibilityReviewerId?.toLowerCase() === userId.toLowerCase() ||
        project.createdById?.toLowerCase() === userId.toLowerCase() ||
        plan?.createdById?.toLowerCase() === userId.toLowerCase();
      if (!isOwner) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }
    }

    const plan = await ProjectPlan.findOne({
      where: { sipProjectId: projectId },
      include: [
        { model: User, as: 'planManager', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: ProjectMilestone, as: 'milestones', order: [['sortOrder', 'ASC']] },
      ],
    });

    res.json({
      success: true,
      data: {
        ...(project.toJSON() as object),
        projectPlan: plan ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/project-plans/:projectId/save
// Save (or update) plan draft
router.post('/:projectId/save', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.user!;

    const project = await SipProject.findByPk(projectId);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    if (!PLANNING_STATUSES.includes(project.status)) {
      res.status(400).json({ success: false, message: 'Project is not in a planning stage' });
      return;
    }

    // Check access – planning manager, feasibility reviewer, or admin/director
    const isPrivileged =
      role === UserRole.ADMIN ||
      role === UserRole.DIRECTOR ||
      role === UserRole.PROGRAMME_MANAGER ||
      role === UserRole.DIRECTOR_HEAD_OF;

    const existingPlan = await ProjectPlan.findOne({ where: { sipProjectId: projectId } });

    if (!isPrivileged) {
      const isOwner =
        project.feasibilityReviewerId?.toLowerCase() === userId.toLowerCase() ||
        project.createdById?.toLowerCase() === userId.toLowerCase() ||
        existingPlan?.createdById?.toLowerCase() === userId.toLowerCase();
      if (!isOwner) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }
    }

    const {
      projectOwner,
      budgetAllocated,
      timelineStart,
      timelineEnd,
      keyDeliverables,
      scope,
      plannedActivities,
      planStatus,
    } = req.body;

    const deliverablesJson =
      typeof keyDeliverables === 'string'
        ? keyDeliverables
        : JSON.stringify(keyDeliverables || []);

    let plan: ProjectPlan;

    const parseNumeric = (val: unknown): number | null => {
      if (val === null || val === undefined || val === '') return null;
      const n = Number(val);
      return isNaN(n) ? null : n;
    };

    if (existingPlan) {
      if (
        !isPrivileged &&
        existingPlan.planStatus !== PlanStatus.AWAITING_BUDGET_APPROVAL &&
        existingPlan.planStatus !== PlanStatus.RESOURCE_REQUESTED &&
        (existingPlan.status === ProjectPlanStatus.SUBMITTED ||
          existingPlan.status === ProjectPlanStatus.DIRECTOR_APPROVED ||
          existingPlan.status === ProjectPlanStatus.CYBER_APPROVED)
      ) {
        res.status(400).json({ success: false, message: 'Plan has already been submitted and cannot be edited' });
        return;
      }

      await existingPlan.update({
        ...(projectOwner !== undefined && { projectOwner }),
        ...(budgetAllocated !== undefined && { budgetAllocated: parseNumeric(budgetAllocated) }),
        ...(timelineStart !== undefined && { timelineStart: (timelineStart ? new Date(timelineStart) : null) as Date | undefined }),
        ...(timelineEnd !== undefined && { timelineEnd: (timelineEnd ? new Date(timelineEnd) : null) as Date | undefined }),
        ...(keyDeliverables !== undefined && { keyDeliverables: deliverablesJson }),
        ...(scope !== undefined && { scope }),
        ...(plannedActivities !== undefined && { plannedActivities }),
        ...(planStatus !== undefined && { planStatus }),
      });
      plan = existingPlan;
    } else {
      plan = await ProjectPlan.create({
        sipProjectId: projectId,
        createdById: userId,
        projectOwner: projectOwner ?? '',
        budgetAllocated: parseNumeric(budgetAllocated),
        timelineStart: timelineStart ? new Date(timelineStart) : undefined,
        timelineEnd: timelineEnd ? new Date(timelineEnd) : undefined,
        keyDeliverables: deliverablesJson,
        scope: scope ?? '',
        plannedActivities: plannedActivities ?? '',
        planStatus: planStatus ?? PlanStatus.IN_PLANNING,
      });

      // Transition project status to IN_PLANNING
      if (project.status === SipProjectStatus.FEASIBILITY_ACCEPTED) {
        await project.update({ status: SipProjectStatus.IN_PLANNING });
      }
    }

    // Sync milestones from keyDeliverables
    if (keyDeliverables !== undefined) {
      await syncMilestones(plan.id, projectId, deliverablesJson);
    }

    res.json({ success: true, data: plan, message: 'Plan draft saved successfully.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/project-plans/:projectId/submit
// Submit plan to director for review
router.post('/:projectId/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.user!;

    const project = await SipProject.findByPk(projectId, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    if (
      project.status !== SipProjectStatus.FEASIBILITY_ACCEPTED &&
      project.status !== SipProjectStatus.IN_PLANNING
    ) {
      res.status(400).json({ success: false, message: 'Project is not in planning stage' });
      return;
    }

    const plan = await ProjectPlan.findOne({ where: { sipProjectId: projectId } });

    const isPrivileged =
      role === UserRole.ADMIN ||
      role === UserRole.DIRECTOR ||
      role === UserRole.PROGRAMME_MANAGER ||
      role === UserRole.DIRECTOR_HEAD_OF;

    if (!isPrivileged) {
      const isOwner =
        project.feasibilityReviewerId?.toLowerCase() === userId.toLowerCase() ||
        project.createdById?.toLowerCase() === userId.toLowerCase() ||
        plan?.createdById?.toLowerCase() === userId.toLowerCase();
      if (!isOwner) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }
    }

    if (!plan) {
      res.status(400).json({ success: false, message: 'Please save the plan before submitting' });
      return;
    }

    if (plan.status === ProjectPlanStatus.SUBMITTED) {
      res.status(400).json({ success: false, message: 'Plan has already been submitted' });
      return;
    }

    // Validate required fields
    const {
      projectOwner,
      budgetAllocated,
      timelineStart,
      timelineEnd,
      keyDeliverables,
      scope,
      plannedActivities,
      planStatus,
    } = req.body;

    const deliverablesJson =
      typeof keyDeliverables === 'string'
        ? keyDeliverables
        : JSON.stringify(keyDeliverables || []);

    const parseNumericBudget = (val: unknown): number | null => {
      if (val === null || val === undefined || val === '') return null;
      const n = Number(val);
      return isNaN(n) ? null : n;
    };

    // Update plan with submitted data and mark as submitted
    await plan.update({
      ...(projectOwner !== undefined && { projectOwner }),
      ...(budgetAllocated !== undefined && { budgetAllocated: parseNumericBudget(budgetAllocated) }),
      ...(timelineStart !== undefined && { timelineStart: (timelineStart ? new Date(timelineStart) : null) as Date | undefined }),
      ...(timelineEnd !== undefined && { timelineEnd: (timelineEnd ? new Date(timelineEnd) : null) as Date | undefined }),
      ...(keyDeliverables !== undefined && { keyDeliverables: deliverablesJson }),
      ...(scope !== undefined && { scope }),
      ...(plannedActivities !== undefined && { plannedActivities }),
      ...(planStatus !== undefined && { planStatus }),
      status: ProjectPlanStatus.SUBMITTED,
      submittedAt: new Date(),
    });

    // Update SipProject status
    await project.update({ status: SipProjectStatus.PLAN_SUBMITTED });

    // Sync milestones
    if (keyDeliverables !== undefined) {
      await syncMilestones(plan.id, projectId, deliverablesJson);
    }

    // Notify directors
    const planManager = await User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName'] });
    const managerName = planManager
      ? `${planManager.firstName} ${planManager.lastName}`
      : 'Project Manager';
    const dept = project.get('department') as Department | null;

    try {
      const directors = await User.findAll({
        where: { role: [UserRole.DIRECTOR, UserRole.DIRECTOR_HEAD_OF], isActive: true },
        attributes: ['id', 'firstName', 'lastName', 'email'],
      });
      for (const director of directors) {
        await sendPlanSubmittedDirectorEmail({
          toEmail: director.email,
          directorName: `${director.firstName} ${director.lastName}`,
          planManagerName: managerName,
          improvementTitle: project.improvementTitle,
          departmentName: dept?.name ?? '',
          projectId: project.id,
        });
      }
    } catch (emailErr) {
      console.error('[Email] Failed to notify directors of plan submission:', emailErr);
    }

    res.json({
      success: true,
      data: plan,
      message: 'Plan submitted successfully. The director has been notified.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/project-plans/:projectId/assign
// Assign planning to another person via email invite
router.post('/:projectId/assign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.user!;
    const { assignToEmail } = req.body;

    if (!assignToEmail?.trim()) {
      res.status(400).json({ success: false, message: 'Email address is required' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(assignToEmail.trim())) {
      res.status(400).json({ success: false, message: 'Invalid email address' });
      return;
    }

    const project = await SipProject.findByPk(projectId, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
      ],
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    if (!PLANNING_STATUSES.includes(project.status)) {
      res.status(400).json({ success: false, message: 'Project is not in a planning stage' });
      return;
    }

    const assigner = await User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName'] });
    const assignerName = assigner ? `${assigner.firstName} ${assigner.lastName}` : 'Project Manager';
    const dept = project.get('department') as Department | null;

    // Update/create plan with assigned email
    let plan = await ProjectPlan.findOne({ where: { sipProjectId: projectId } });
    if (plan) {
      await plan.update({ assignedToEmail: assignToEmail.trim(), projectOwner: assignToEmail.trim() });
    } else {
      plan = await ProjectPlan.create({
        sipProjectId: projectId,
        createdById: userId,
        projectOwner: assignToEmail.trim(),
        budgetAllocated: null,
        keyDeliverables: '[]',
        scope: '',
        plannedActivities: '',
        planStatus: PlanStatus.IN_PLANNING,
        assignedToEmail: assignToEmail.trim(),
      });

      if (project.status === SipProjectStatus.FEASIBILITY_ACCEPTED) {
        await project.update({ status: SipProjectStatus.IN_PLANNING });
      }
    }

    // Send email invite
    try {
      await sendPlanningAssignmentEmail({
        toEmail: assignToEmail.trim(),
        improvementTitle: project.improvementTitle,
        departmentName: dept?.name ?? '',
        assignedByName: assignerName,
        projectId: project.id,
      });
    } catch (emailErr) {
      console.error('[Email] Failed to send planning assignment email:', emailErr);
    }

    res.json({
      success: true,
      message: `Planning assignment email sent to ${assignToEmail.trim()}. They will be asked to log in and complete the plan.`,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/project-plans/:projectId/contact-cyber
// Send cyber assistance request from the planning stage
router.post('/:projectId/contact-cyber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.user!;

    const project = await SipProject.findByPk(projectId);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    const requester = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'email'],
    });
    if (!requester) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const cyberTeam = await User.findAll({
      where: { role: UserRole.CYBER, isActive: true },
      attributes: ['id', 'firstName', 'lastName', 'email'],
    });

    if (cyberTeam.length === 0) {
      res.json({
        success: true,
        message: 'Request recorded. No cyber team members found to notify at this time.',
      });
      return;
    }

    try {
      for (const cyberMember of cyberTeam) {
        await sendPlanningCyberAssistanceEmail({
          toEmail: cyberMember.email,
          requesterName: `${requester.firstName} ${requester.lastName}`,
          requesterEmail: requester.email,
          improvementTitle: project.improvementTitle,
          projectId: project.id,
        });
      }
    } catch (emailErr) {
      console.error('[Email] Failed to send planning cyber assistance request:', emailErr);
    }

    res.json({
      success: true,
      message: 'Cyber team has been notified and will contact you shortly.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/project-plans/:projectId/director-approve
// Director approves the plan – moves to cyber review
router.post(
  '/:projectId/director-approve',
  authorize(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.PROGRAMME_MANAGER, UserRole.DIRECTOR_HEAD_OF),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const { userId } = req.user!;

      const project = await SipProject.findByPk(projectId, {
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });

      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found' });
        return;
      }

      if (project.status !== SipProjectStatus.PLAN_SUBMITTED) {
        res.status(400).json({ success: false, message: 'Project plan must be submitted before it can be approved' });
        return;
      }

      const plan = await ProjectPlan.findOne({ where: { sipProjectId: projectId } });
      if (!plan || plan.status !== ProjectPlanStatus.SUBMITTED) {
        res.status(400).json({ success: false, message: 'No submitted plan found for this project' });
        return;
      }

      await plan.update({
        status: ProjectPlanStatus.DIRECTOR_APPROVED,
        directorReviewedById: userId,
        directorReviewedAt: new Date(),
        directorRejectionReason: undefined,
      });

      await project.update({ status: SipProjectStatus.PLAN_DIRECTOR_APPROVED });

      // Get approver details
      const approver = await User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName'] });
      const approverName = approver ? `${approver.firstName} ${approver.lastName}` : 'Director';
      const dept = project.get('department') as Department | null;

      // Notify cyber team
      try {
        const cyberTeam = await User.findAll({
          where: { role: UserRole.CYBER, isActive: true },
          attributes: ['id', 'firstName', 'lastName', 'email'],
        });
        for (const cyberMember of cyberTeam) {
          await sendPlanDirectorApprovedEmail({
            toEmail: cyberMember.email,
            recipientName: `${cyberMember.firstName} ${cyberMember.lastName}`,
            improvementTitle: project.improvementTitle,
            departmentName: dept?.name ?? '',
            approvedByName: approverName,
            projectId: project.id,
          });
        }
      } catch (emailErr) {
        console.error('[Email] Failed to send plan director-approved notification:', emailErr);
      }

      res.json({
        success: true,
        message: 'Plan approved. Cyber Security has been notified to conduct their review.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/project-plans/:projectId/director-reject
// Director rejects the plan – sends back to planning manager
router.post(
  '/:projectId/director-reject',
  authorize(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.PROGRAMME_MANAGER, UserRole.DIRECTOR_HEAD_OF),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const { userId } = req.user!;
      const { rejectionReason } = req.body;

      if (!rejectionReason?.trim()) {
        res.status(400).json({ success: false, message: 'Rejection reason is required' });
        return;
      }

      const project = await SipProject.findByPk(projectId, {
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'] },
        ],
      });

      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found' });
        return;
      }

      if (project.status !== SipProjectStatus.PLAN_SUBMITTED) {
        res.status(400).json({ success: false, message: 'Project plan must be submitted before it can be rejected' });
        return;
      }

      const plan = await ProjectPlan.findOne({ where: { sipProjectId: projectId } });
      if (!plan) {
        res.status(400).json({ success: false, message: 'No plan found for this project' });
        return;
      }

      await plan.update({
        status: ProjectPlanStatus.DIRECTOR_REJECTED,
        directorReviewedById: userId,
        directorReviewedAt: new Date(),
        directorRejectionReason: rejectionReason.trim(),
      });

      // Return to IN_PLANNING so manager can update and resubmit
      await project.update({ status: SipProjectStatus.IN_PLANNING });

      res.json({
        success: true,
        message: 'Plan rejected. The planning manager can update and resubmit.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/project-plans/:projectId/cyber-approve
// Cyber Security approves the plan – marks as PLAN_COMPLETE
router.post(
  '/:projectId/cyber-approve',
  authorize(UserRole.ADMIN, UserRole.CYBER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const { userId } = req.user!;

      const project = await SipProject.findByPk(projectId, {
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });

      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found' });
        return;
      }

      if (project.status !== SipProjectStatus.PLAN_DIRECTOR_APPROVED) {
        res.status(400).json({ success: false, message: 'Plan must be director-approved before cyber can approve' });
        return;
      }

      const plan = await ProjectPlan.findOne({ where: { sipProjectId: projectId } });
      if (!plan || plan.status !== ProjectPlanStatus.DIRECTOR_APPROVED) {
        res.status(400).json({ success: false, message: 'No director-approved plan found for this project' });
        return;
      }

      await plan.update({
        status: ProjectPlanStatus.CYBER_APPROVED,
        cyberApprovedById: userId,
        cyberApprovedAt: new Date(),
      });

      await project.update({ status: SipProjectStatus.PLAN_COMPLETE });

      const approver = await User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName'] });
      const approverName = approver ? `${approver.firstName} ${approver.lastName}` : 'Cyber Security';
      const dept = project.get('department') as Department | null;

      // Notify planning manager / feasibility reviewer / creator
      const notifyEmails: { email: string; name: string }[] = [];
      const creator = project.get('createdBy') as User | null;
      const reviewer = project.get('feasibilityReviewer') as User | null;
      const planManager = await User.findByPk(plan.createdById, { attributes: ['id', 'firstName', 'lastName', 'email'] });

      if (creator?.email) notifyEmails.push({ email: creator.email, name: `${creator.firstName} ${creator.lastName}` });
      if (reviewer?.email && reviewer.id !== creator?.id) {
        notifyEmails.push({ email: reviewer.email, name: `${reviewer.firstName} ${reviewer.lastName}` });
      }
      if (planManager?.email && planManager.id !== creator?.id && planManager.id !== reviewer?.id) {
        notifyEmails.push({ email: planManager.email, name: `${planManager.firstName} ${planManager.lastName}` });
      }

      try {
        for (const recipient of notifyEmails) {
          await sendPlanCyberApprovedEmail({
            toEmail: recipient.email,
            recipientName: recipient.name,
            improvementTitle: project.improvementTitle,
            departmentName: dept?.name ?? '',
            approvedByName: approverName,
            projectId: project.id,
          });
        }
      } catch (emailErr) {
        console.error('[Email] Failed to send plan cyber-approved notification:', emailErr);
      }

      res.json({
        success: true,
        message: 'Project plan fully approved. The project is now ready to proceed to implementation.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/project-plans/:projectId/cyber-reject
// Cyber Security returns the plan for revision – sends back to planning manager
router.post(
  '/:projectId/cyber-reject',
  authorize(UserRole.ADMIN, UserRole.CYBER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const { userId } = req.user!;
      const { rejectionReason } = req.body;

      if (!rejectionReason?.trim()) {
        res.status(400).json({ success: false, message: 'Revision reason is required' });
        return;
      }

      const project = await SipProject.findByPk(projectId, {
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });

      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found' });
        return;
      }

      if (project.status !== SipProjectStatus.PLAN_DIRECTOR_APPROVED) {
        res.status(400).json({ success: false, message: 'Plan must be director-approved before cyber can request revision' });
        return;
      }

      const plan = await ProjectPlan.findOne({ where: { sipProjectId: projectId } });
      if (!plan || plan.status !== ProjectPlanStatus.DIRECTOR_APPROVED) {
        res.status(400).json({ success: false, message: 'No director-approved plan found for this project' });
        return;
      }

      await plan.update({
        status: ProjectPlanStatus.CYBER_REJECTED,
        cyberReviewedById: userId,
        cyberReviewedAt: new Date(),
        cyberRejectionReason: rejectionReason.trim(),
      });

      // Return to IN_PLANNING so the planning manager can update and resubmit
      await project.update({ status: SipProjectStatus.IN_PLANNING });

      res.json({
        success: true,
        message: 'Plan returned for revision. The planning manager can update and resubmit.',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
