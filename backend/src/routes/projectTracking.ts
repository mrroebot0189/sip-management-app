import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole, SipProjectStatus, ProjectTrackingStatus } from '../types';
import { SipProject, ProjectStatusUpdate, User, Department, ProjectPlan, ProjectMilestone } from '../models';
import {
  sendStatusUpdateNotificationEmail,
  sendUrgentStatusAlertEmail,
  sendProjectCompleteNotificationEmail,
  sendClosureVerifiedEmail,
} from '../services/emailService';

const router = Router();

const URGENT_STATUSES: ProjectTrackingStatus[] = [
  ProjectTrackingStatus.BLOCKED,
  ProjectTrackingStatus.ON_HOLD,
  ProjectTrackingStatus.ESCALATION_NEEDED,
];

// Helper – get all users with cyber/admin role emails
const getCyberEmails = async (): Promise<{ email: string; firstName: string; lastName: string }[]> => {
  const cyberUsers = await User.findAll({
    where: { role: [UserRole.CYBER, UserRole.ADMIN], isActive: true },
    attributes: ['email', 'firstName', 'lastName'],
  });
  return cyberUsers.map((u) => ({ email: u.email, firstName: u.firstName, lastName: u.lastName }));
};

// Helper – get all users with director role emails
const getDirectorEmails = async (): Promise<{ email: string; firstName: string; lastName: string }[]> => {
  const directorUsers = await User.findAll({
    where: { role: [UserRole.DIRECTOR, UserRole.DIRECTOR_HEAD_OF], isActive: true },
    attributes: ['email', 'firstName', 'lastName'],
  });
  return directorUsers.map((u) => ({ email: u.email, firstName: u.firstName, lastName: u.lastName }));
};

// GET /api/project-tracking/active – all active projects (cyber/admin/directors see all; others see own dept)
router.get('/active', authenticate, async (req: Request, res: Response) => {
  try {
    const canSeeAll =
      req.user!.role === UserRole.CYBER ||
      req.user!.role === UserRole.ADMIN ||
      req.user!.role === UserRole.DIRECTOR ||
      req.user!.role === UserRole.DIRECTOR_HEAD_OF;

    const whereClause: Record<string, unknown> = { status: SipProjectStatus.ACTIVE };
    if (!canSeeAll) {
      // Non-privileged users see projects for their own department (via createdById)
      whereClause['createdById'] = req.user!.userId;
    }

    const projects = await SipProject.findAll({
      where: whereClause,
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'contactEmail'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        {
          model: ProjectStatusUpdate,
          as: 'statusUpdates',
          include: [{ model: User, as: 'submittedBy', attributes: ['id', 'firstName', 'lastName'] }],
          order: [['submittedAt', 'DESC']],
          limit: 1,
          separate: true,
        },
        {
          model: ProjectPlan,
          as: 'projectPlan',
          attributes: ['id', 'timelineStart', 'timelineEnd', 'planStatus'],
          include: [
            {
              model: ProjectMilestone,
              as: 'milestones',
              attributes: ['id', 'title', 'details', 'dueDate', 'status', 'completedAt', 'sortOrder'],
            },
          ],
        },
      ],
      order: [['activeStartDate', 'ASC']],
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error fetching active projects:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch active projects' });
  }
});

// GET /api/project-tracking/completed – projects awaiting cyber closure validation
router.get('/completed', authenticate, async (req: Request, res: Response) => {
  try {
    const projects = await SipProject.findAll({
      where: { status: SipProjectStatus.PROJECT_COMPLETE },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        {
          model: ProjectStatusUpdate,
          as: 'statusUpdates',
          include: [{ model: User, as: 'submittedBy', attributes: ['id', 'firstName', 'lastName'] }],
          order: [['submittedAt', 'DESC']],
          limit: 1,
          separate: true,
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error fetching completed projects:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch completed projects' });
  }
});

// GET /api/project-tracking/closed – closed and verified projects
router.get('/closed', authenticate, async (req: Request, res: Response) => {
  try {
    const isCyber = req.user!.role === UserRole.CYBER || req.user!.role === UserRole.ADMIN;

    const whereClause: Record<string, unknown> = { status: SipProjectStatus.CLOSED_VERIFIED };
    if (!isCyber) {
      whereClause['createdById'] = req.user!.userId;
    }

    const projects = await SipProject.findAll({
      where: whereClause,
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['updatedAt', 'DESC']],
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error fetching closed projects:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch closed projects' });
  }
});

// GET /api/project-tracking/department/:deptId – dept tracker with milestones
router.get('/department/:deptId', authenticate, async (req: Request, res: Response) => {
  try {
    const { deptId } = req.params;

    const activeStatuses = [
      SipProjectStatus.ACTIVE,
      SipProjectStatus.PROJECT_COMPLETE,
      SipProjectStatus.CLOSED_VERIFIED,
    ];

    const projects = await SipProject.findAll({
      where: { departmentId: deptId, status: activeStatuses },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'contactEmail'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        {
          model: ProjectStatusUpdate,
          as: 'statusUpdates',
          include: [{ model: User, as: 'submittedBy', attributes: ['id', 'firstName', 'lastName'] }],
          order: [['submittedAt', 'DESC']],
          separate: true,
        },
        {
          model: ProjectPlan,
          as: 'projectPlan',
          attributes: ['id', 'timelineStart', 'timelineEnd', 'planStatus', 'scope', 'budgetAllocated'],
          include: [
            {
              model: ProjectMilestone,
              as: 'milestones',
              attributes: ['id', 'title', 'details', 'dueDate', 'status', 'completedAt', 'sortOrder'],
              order: [['sortOrder', 'ASC']],
            },
          ],
        },
      ],
      order: [['activeStartDate', 'ASC']],
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error fetching department tracker:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch department tracker' });
  }
});

// GET /api/project-tracking/:projectId/status-history
router.get('/:projectId/status-history', authenticate, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const project = await SipProject.findByPk(projectId, {
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const updates = await ProjectStatusUpdate.findAll({
      where: { sipProjectId: projectId },
      include: [{ model: User, as: 'submittedBy', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['submittedAt', 'DESC']],
    });

    res.json({ success: true, data: updates });
  } catch (error) {
    console.error('Error fetching status history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch status history' });
  }
});

// POST /api/project-tracking/:projectId/status-update
router.post('/:projectId/status-update', authenticate, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { status, comment, newStartDate, newEndDate } = req.body;

    if (!status || !comment?.trim()) {
      return res.status(400).json({ success: false, message: 'Status and comment are required' });
    }

    if (!Object.values(ProjectTrackingStatus).includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const project = await SipProject.findByPk(projectId, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'contactEmail'] },
        { model: ProjectPlan, as: 'projectPlan', attributes: ['id', 'timelineStart', 'timelineEnd'] },
      ],
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.status !== SipProjectStatus.ACTIVE) {
      return res.status(400).json({ success: false, message: 'Project is not currently active' });
    }

    // Update project plan dates if provided
    const projectPlan = (project as any).projectPlan as ProjectPlan | null;
    if (projectPlan && (newStartDate || newEndDate)) {
      const dateUpdates: Record<string, Date | boolean | null> = {};
      if (newStartDate) {
        dateUpdates.timelineStart = new Date(newStartDate);
        dateUpdates.startDateAmended = true;
      }
      if (newEndDate) dateUpdates.timelineEnd = new Date(newEndDate);
      await projectPlan.update(dateUpdates);
    }

    const isUrgent = URGENT_STATUSES.includes(status as ProjectTrackingStatus);

    const statusUpdate = await ProjectStatusUpdate.create({
      sipProjectId: projectId,
      status: status as ProjectTrackingStatus,
      comment: comment.trim(),
      submittedById: req.user!.userId,
      isUrgent,
      submittedAt: new Date(),
    });

    const submitter = await User.findByPk(req.user!.userId, {
      attributes: ['id', 'firstName', 'lastName', 'email'],
    });
    const submittedByName = submitter ? `${submitter.firstName} ${submitter.lastName}` : 'Unknown';
    const submittedByEmail = submitter?.email || '';
    const dept = (project as any).department;
    const deptName = dept?.name || 'Unknown';

    // If project_complete status selected, move project to PROJECT_COMPLETE
    if (status === ProjectTrackingStatus.PROJECT_COMPLETE) {
      await project.update({ status: SipProjectStatus.PROJECT_COMPLETE });

      // Notify cyber team and directors to validate closure
      const [cyberUsers, directorUsers] = await Promise.all([getCyberEmails(), getDirectorEmails()]);
      const allRecipients = [...cyberUsers, ...directorUsers];
      for (const recipient of allRecipients) {
        await sendProjectCompleteNotificationEmail({
          toEmail: recipient.email,
          recipientName: `${recipient.firstName} ${recipient.lastName}`,
          improvementTitle: project.improvementTitle,
          departmentName: deptName,
          completedByName: submittedByName,
          projectId,
        });
      }
    } else {
      // Standard notification to cyber and directors
      const [cyberUsers, directorUsers] = await Promise.all([getCyberEmails(), getDirectorEmails()]);
      const allRecipients = [...cyberUsers, ...directorUsers];
      for (const recipient of allRecipients) {
        if (isUrgent) {
          await sendUrgentStatusAlertEmail({
            toEmail: recipient.email,
            improvementTitle: project.improvementTitle,
            departmentName: deptName,
            updateStatus: status,
            comment: comment.trim(),
            submittedByName,
            submittedByEmail,
            projectId,
          });
        } else {
          await sendStatusUpdateNotificationEmail({
            toEmail: recipient.email,
            recipientName: `${recipient.firstName} ${recipient.lastName}`,
            improvementTitle: project.improvementTitle,
            departmentName: deptName,
            updateStatus: status,
            comment: comment.trim(),
            submittedByName,
            projectId,
          });
        }
      }
    }

    res.json({ success: true, data: statusUpdate, message: 'Status update submitted successfully' });
  } catch (error) {
    console.error('Error submitting status update:', error);
    res.status(500).json({ success: false, message: 'Failed to submit status update' });
  }
});

// POST /api/project-tracking/:projectId/verify-closure (cyber only)
router.post(
  '/:projectId/verify-closure',
  authenticate,
  authorize(UserRole.CYBER, UserRole.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      const project = await SipProject.findByPk(projectId, {
        include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'contactEmail'] }],
      });
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      if (project.status !== SipProjectStatus.PROJECT_COMPLETE) {
        return res.status(400).json({ success: false, message: 'Project must be in "project complete" status to verify closure' });
      }

      await project.update({ status: SipProjectStatus.CLOSED_VERIFIED });

      // Create a final status update record
      await ProjectStatusUpdate.create({
        sipProjectId: projectId,
        status: ProjectTrackingStatus.CLOSED_AND_VERIFIED,
        comment: 'Project closure validated and verified by Cyber Security.',
        submittedById: req.user!.userId,
        isUrgent: false,
        submittedAt: new Date(),
      });

      const verifier = await User.findByPk(req.user!.userId, {
        attributes: ['id', 'firstName', 'lastName', 'email'],
      });
      const verifiedByName = verifier ? `${verifier.firstName} ${verifier.lastName}` : 'Cyber Security';
      const dept = (project as any).department;
      const deptName = dept?.name || 'Unknown';

      // Notify project creator / department contact
      const creator = await User.findByPk(project.createdById, {
        attributes: ['id', 'firstName', 'lastName', 'email'],
      });
      if (creator) {
        await sendClosureVerifiedEmail({
          toEmail: creator.email,
          recipientName: `${creator.firstName} ${creator.lastName}`,
          improvementTitle: project.improvementTitle,
          departmentName: deptName,
          verifiedByName,
          projectId,
        });
      }
      if (dept?.contactEmail && dept.contactEmail !== creator?.email) {
        await sendClosureVerifiedEmail({
          toEmail: dept.contactEmail,
          recipientName: 'Team',
          improvementTitle: project.improvementTitle,
          departmentName: deptName,
          verifiedByName,
          projectId,
        });
      }

      res.json({ success: true, message: 'Project closure verified successfully' });
    } catch (error) {
      console.error('Error verifying closure:', error);
      res.status(500).json({ success: false, message: 'Failed to verify project closure' });
    }
  }
);

// GET /api/project-tracking/:projectId – full project details with milestones & status history
router.get('/:projectId', authenticate, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const isCyber = req.user!.role === UserRole.CYBER || req.user!.role === UserRole.ADMIN;

    const project = await SipProject.findByPk(projectId, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'contactEmail'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        {
          model: ProjectStatusUpdate,
          as: 'statusUpdates',
          include: [{ model: User, as: 'submittedBy', attributes: ['id', 'firstName', 'lastName'] }],
          order: [['submittedAt', 'DESC']],
          separate: true,
        },
        {
          model: ProjectPlan,
          as: 'projectPlan',
          attributes: ['id', 'timelineStart', 'timelineEnd', 'planStatus', 'scope', 'projectOwner'],
          include: [
            {
              model: ProjectMilestone,
              as: 'milestones',
              attributes: ['id', 'title', 'details', 'dueDate', 'status', 'completedAt', 'sortOrder'],
            },
          ],
        },
      ],
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (!isCyber && project.createdById !== req.user!.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project details' });
  }
});

// POST /api/project-tracking/:projectId/activate – manually activate a plan_complete project
router.post(
  '/:projectId/activate',
  authenticate,
  authorize(UserRole.CYBER, UserRole.ADMIN, UserRole.PROGRAMME_MANAGER),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      const project = await SipProject.findByPk(projectId, {
        include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'contactEmail'] }],
      });
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      if (project.status !== SipProjectStatus.PLAN_COMPLETE) {
        return res.status(400).json({ success: false, message: 'Only plan_complete projects can be activated' });
      }

      await project.update({
        status: SipProjectStatus.ACTIVE,
        activeStartDate: new Date(),
      });

      res.json({ success: true, message: 'Project activated successfully' });
    } catch (error) {
      console.error('Error activating project:', error);
      res.status(500).json({ success: false, message: 'Failed to activate project' });
    }
  }
);

export default router;
