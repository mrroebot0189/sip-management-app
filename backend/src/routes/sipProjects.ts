import { Router, Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { SipProject, Department, User, FeasibilityReview, ProjectPlan, ProjectMilestone, ProjectStatusUpdate } from '../models';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole, SipProjectStatus, SipPriority } from '../types';
import {
  sendSipSubmissionEmail,
  sendFeasibilityReviewerEmail,
  sendCyberRejectionEmail,
  sendProjectApprovedOwnerEmail,
} from '../services/emailService';

const router = Router();
router.use(authenticate);

const calculatePriority = (risk: string, mitigationEffectiveness: string): SipPriority => {
  if (risk === 'Critical' && mitigationEffectiveness === 'Highly Effective') return SipPriority.P1;
  if (risk === 'Significant') return SipPriority.P2;
  if (risk === 'Moderate' && mitigationEffectiveness === 'Partially Effective') return SipPriority.P4;
  if (risk === 'Moderate') return SipPriority.P3;
  if (risk === 'Low') return SipPriority.P4;
  return SipPriority.P2;
};

// GET /api/sip-projects - list projects
// Directors/admins see all NEW projects; cyber/others see their own
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, userId } = req.user!;

    const isPrivileged =
      role === UserRole.ADMIN ||
      role === UserRole.DIRECTOR ||
      role === UserRole.PROGRAMME_MANAGER;

    const where = isPrivileged
      ? { status: { [Op.notIn]: [SipProjectStatus.PROJECT_COMPLETE, SipProjectStatus.CLOSED_VERIFIED] } }
      : {
          createdById: userId,
          status: { [Op.notIn]: [SipProjectStatus.PROJECT_COMPLETE, SipProjectStatus.CLOSED_VERIFIED] },
        };

    const projects = await SipProject.findAll({
      where,
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
});

// GET /api/sip-projects/drafts - list current user's draft projects
router.get('/drafts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;

    const projects = await SipProject.findAll({
      where: { status: SipProjectStatus.DRAFT, createdById: userId },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['updatedAt', 'DESC']],
    });

    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
});

// GET /api/sip-projects/my-submitted - list current user's submitted (non-draft) projects
router.get('/my-submitted', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;

    const projects = await SipProject.findAll({
      where: {
        createdById: userId,
        status: [
          SipProjectStatus.NEW,
          SipProjectStatus.APPROVED,
          SipProjectStatus.REJECTED,
          SipProjectStatus.UNDER_REVIEW,
          SipProjectStatus.FEASIBILITY_ASSESSMENT,
          SipProjectStatus.FEASIBILITY_ACCEPTED,
          SipProjectStatus.FEASIBILITY_REJECTED,
          SipProjectStatus.NON_IMPLEMENTING,
          SipProjectStatus.IN_PLANNING,
          SipProjectStatus.PLAN_SUBMITTED,
          SipProjectStatus.PLAN_DIRECTOR_APPROVED,
          SipProjectStatus.PLAN_COMPLETE,
          SipProjectStatus.ACTIVE,
        ],
      },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['submittedAt', 'DESC']],
    });

    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
});

// GET /api/sip-projects/new - list only NEW projects (for director dashboard)
router.get(
  '/new',
  authorize(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.PROGRAMME_MANAGER, UserRole.DIRECTOR_HEAD_OF),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const projects = await SipProject.findAll({
        where: { status: SipProjectStatus.NEW },
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
        order: [['submittedAt', 'DESC']],
      });

      res.json({ success: true, data: projects });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/sip-projects/rejected - list director-rejected projects (for director dashboard)
router.get(
  '/rejected',
  authorize(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.PROGRAMME_MANAGER, UserRole.DIRECTOR_HEAD_OF),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const projects = await SipProject.findAll({
        where: { status: SipProjectStatus.REJECTED },
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'rejectedBy', attributes: ['id', 'firstName', 'lastName'] },
        ],
        order: [['rejectedAt', 'DESC']],
      });

      res.json({ success: true, data: projects });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/sip-projects/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await SipProject.findByPk(req.params['id'], {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'contactEmail', 'director', 'chief'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'SIP project not found' });
      return;
    }

    const { role, userId } = req.user!;
    const isPrivileged =
      role === UserRole.ADMIN ||
      role === UserRole.DIRECTOR ||
      role === UserRole.PROGRAMME_MANAGER ||
      role === UserRole.DIRECTOR_HEAD_OF;

    if (!isPrivileged && project.createdById !== userId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sip-projects/:id - delete a project
// Admins can delete any project; cyber users can withdraw/delete their own projects at any stage;
// other non-admins can only delete their own drafts
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await SipProject.findByPk(req.params['id']);

    if (!project) {
      res.status(404).json({ success: false, message: 'SIP project not found' });
      return;
    }

    const { role, userId } = req.user!;
    const isAdmin = role === UserRole.ADMIN;
    const isCyber = role === UserRole.CYBER;

    if (!isAdmin && project.createdById !== userId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    if (!isAdmin && !isCyber && project.status !== SipProjectStatus.DRAFT) {
      res.status(400).json({ success: false, message: 'Only draft projects can be deleted' });
      return;
    }

    // For submitted projects, cascade delete all related records first
    if (project.status !== SipProjectStatus.DRAFT) {
      await ProjectStatusUpdate.destroy({ where: { sipProjectId: project.id } });
      const plan = await ProjectPlan.findOne({ where: { sipProjectId: project.id } });
      if (plan) {
        await ProjectMilestone.destroy({ where: { projectPlanId: plan.id } });
        await plan.destroy();
      }
      await FeasibilityReview.destroy({ where: { sipProjectId: project.id } });
    }

    await project.destroy();

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/sip-projects - create (save as draft)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { improvementTitle, projectProblem, mitigationEffectiveness, desiredOutcomes, risk, departmentId } =
      req.body;

    if (!improvementTitle?.trim()) {
      res.status(400).json({ success: false, message: 'Improvement title is required' });
      return;
    }
    if (!projectProblem?.trim()) {
      res.status(400).json({ success: false, message: 'Project problem / weakness is required' });
      return;
    }
    if (!desiredOutcomes?.trim()) {
      res.status(400).json({ success: false, message: 'Desired outcomes are required' });
      return;
    }
    if (!risk?.trim()) {
      res.status(400).json({ success: false, message: 'Risk is required' });
      return;
    }
    if (!mitigationEffectiveness?.trim()) {
      res.status(400).json({ success: false, message: 'Mitigation effectiveness is required' });
      return;
    }
    if (!departmentId) {
      res.status(400).json({ success: false, message: 'Department is required' });
      return;
    }

    const department = await Department.findByPk(departmentId);
    if (!department) {
      res.status(404).json({ success: false, message: 'Department not found' });
      return;
    }

    const trimmedRisk = risk.trim();
    const trimmedMitigationEffectiveness = mitigationEffectiveness.trim();
    const calculatedPriority = calculatePriority(trimmedRisk, trimmedMitigationEffectiveness);

    const project = await SipProject.create({
      improvementTitle: improvementTitle.trim(),
      projectProblem: projectProblem.trim(),
      mitigationEffectiveness: trimmedMitigationEffectiveness,
      desiredOutcomes: desiredOutcomes.trim(),
      risk: trimmedRisk,
      priority: calculatedPriority,
      departmentId,
      createdById: req.user!.userId,
      status: SipProjectStatus.DRAFT,
    });

    const created = await SipProject.findByPk(project.id, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    res.status(201).json({ success: true, data: created, message: 'Draft saved successfully' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/sip-projects/:id - update a draft
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await SipProject.findByPk(req.params['id']);

    if (!project) {
      res.status(404).json({ success: false, message: 'SIP project not found' });
      return;
    }

    const { role, userId } = req.user!;
    if (role !== UserRole.ADMIN && project.createdById !== userId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    if (project.status !== SipProjectStatus.DRAFT) {
      res.status(400).json({ success: false, message: 'Only draft projects can be updated' });
      return;
    }

    const { improvementTitle, projectProblem, mitigationEffectiveness, desiredOutcomes, risk, departmentId } =
      req.body;

    const nextRisk = typeof risk === 'string' && risk.trim() ? risk.trim() : project.risk;
    const nextMitigationEffectiveness =
      typeof mitigationEffectiveness === 'string' && mitigationEffectiveness.trim()
        ? mitigationEffectiveness.trim()
        : project.mitigationEffectiveness;
    const calculatedPriority = calculatePriority(nextRisk, nextMitigationEffectiveness);

    await project.update({
      ...(improvementTitle && { improvementTitle: improvementTitle.trim() }),
      ...(projectProblem && { projectProblem: projectProblem.trim() }),
      ...(mitigationEffectiveness && { mitigationEffectiveness: mitigationEffectiveness.trim() }),
      ...(desiredOutcomes && { desiredOutcomes: desiredOutcomes.trim() }),
      ...(risk && { risk: risk.trim() }),
      priority: calculatedPriority,
      ...(departmentId && { departmentId }),
    });

    const updated = await SipProject.findByPk(project.id, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    res.json({ success: true, data: updated, message: 'Draft saved successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/sip-projects/:id/submit - submit project (changes status to NEW, sends email)
router.post('/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await SipProject.findByPk(req.params['id'], {
      include: [
        { model: Department, as: 'department' },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'SIP project not found' });
      return;
    }

    const { role, userId } = req.user!;
    if (role !== UserRole.ADMIN && project.createdById !== userId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    if (project.status !== SipProjectStatus.DRAFT) {
      res.status(400).json({ success: false, message: 'Project has already been submitted' });
      return;
    }

    await project.update({
      status: SipProjectStatus.NEW,
      submittedAt: new Date(),
    });

    // Send notification email to department contact
    const dept = project.get('department') as Department | null;
    if (dept && dept.contactEmail) {
      const creator = project.get('createdBy') as User | null;
      const creatorName = creator
        ? `${creator.firstName} ${creator.lastName}`
        : 'Cyber Security Team';

      try {
        await sendSipSubmissionEmail({
          toEmail: dept.contactEmail,
          departmentName: dept.name,
          improvementTitle: project.improvementTitle,
          submittedByName: creatorName,
          projectId: project.id,
        });
      } catch (emailErr) {
        console.error('[Email] Failed to send SIP submission notification:', emailErr);
        // Don't fail the request if email fails
      }
    }

    const updated = await SipProject.findByPk(project.id, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    res.json({
      success: true,
      data: updated,
      message: 'Project submitted successfully. The department has been notified.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/sip-projects/:id/approve – director accepts and assigns feasibility reviewer
router.post(
  '/:id/approve',
  authorize(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.PROGRAMME_MANAGER, UserRole.DIRECTOR_HEAD_OF),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await SipProject.findByPk(req.params['id'], {
        include: [
          { model: Department, as: 'department' },
          { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });

      if (!project) {
        res.status(404).json({ success: false, message: 'SIP project not found' });
        return;
      }

      if (project.status !== SipProjectStatus.NEW) {
        res.status(400).json({ success: false, message: 'Only new projects can be approved' });
        return;
      }

      const { feasibilityReviewerId } = req.body;
      if (!feasibilityReviewerId) {
        res.status(400).json({ success: false, message: 'Feasibility reviewer is required' });
        return;
      }

      const reviewer = await User.findByPk(feasibilityReviewerId, {
        attributes: ['id', 'firstName', 'lastName', 'email'],
      });
      if (!reviewer) {
        res.status(404).json({ success: false, message: 'Selected reviewer not found' });
        return;
      }

      await project.update({
        status: SipProjectStatus.FEASIBILITY_ASSESSMENT,
        approvedById: req.user!.userId,
        approvedAt: new Date(),
        feasibilityReviewerId,
        feasibilityReviewerAssignedAt: new Date(),
      });

      const dept = project.get('department') as Department | null;
      const creator = project.get('createdBy') as User | null;

      // Email the assigned feasibility reviewer
      try {
        await sendFeasibilityReviewerEmail({
          toEmail: reviewer.email,
          reviewerName: `${reviewer.firstName} ${reviewer.lastName}`,
          improvementTitle: project.improvementTitle,
          departmentName: dept?.name ?? '',
          projectId: project.id,
        });
      } catch (emailErr) {
        console.error('[Email] Failed to send feasibility reviewer notification:', emailErr);
      }

      // Email the project owner/creator to notify their project has been approved
      if (creator?.email) {
        try {
          await sendProjectApprovedOwnerEmail({
            toEmail: creator.email,
            ownerName: `${creator.firstName} ${creator.lastName}`,
            improvementTitle: project.improvementTitle,
            departmentName: dept?.name ?? '',
            projectId: project.id,
          });
        } catch (emailErr) {
          console.error('[Email] Failed to send owner approval notification:', emailErr);
        }
      }

      const updated = await SipProject.findByPk(project.id, {
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'approvedBy', attributes: ['id', 'firstName', 'lastName'] },
          { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });

      res.json({
        success: true,
        data: updated,
        message: 'Project approved. Feasibility reviewer has been notified.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/sip-projects/:id/reject – director rejects and notifies cyber
router.post(
  '/:id/reject',
  authorize(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.PROGRAMME_MANAGER, UserRole.DIRECTOR_HEAD_OF),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await SipProject.findByPk(req.params['id'], {
        include: [
          { model: Department, as: 'department' },
          { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });

      if (!project) {
        res.status(404).json({ success: false, message: 'SIP project not found' });
        return;
      }

      if (project.status !== SipProjectStatus.NEW) {
        res.status(400).json({ success: false, message: 'Only new projects can be rejected' });
        return;
      }

      const { rejectionReason } = req.body;
      if (!rejectionReason?.trim()) {
        res.status(400).json({ success: false, message: 'Rejection reason is required' });
        return;
      }

      await project.update({
        status: SipProjectStatus.REJECTED,
        rejectedById: req.user!.userId,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason.trim(),
      });

      // Clear the draft separately – column may not exist on older deployments
      try {
        await project.update({ rejectionReasonDraft: null });
      } catch {
        // Silently ignore if rejectionReasonDraft column is not yet present
      }

      // Email the cyber creator
      const creator = project.get('createdBy') as User | null;
      const dept = project.get('department') as Department | null;
      if (creator?.email) {
        try {
          await sendCyberRejectionEmail({
            toEmail: creator.email,
            cyberName: `${creator.firstName} ${creator.lastName}`,
            improvementTitle: project.improvementTitle,
            departmentName: dept?.name ?? '',
            rejectionReason: rejectionReason.trim(),
            projectId: project.id,
          });
        } catch (emailErr) {
          console.error('[Email] Failed to send rejection notification:', emailErr);
        }
      }

      const updated = await SipProject.findByPk(project.id, {
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'rejectedBy', attributes: ['id', 'firstName', 'lastName'] },
        ],
      });

      res.json({
        success: true,
        data: updated,
        message: 'Project rejected. The cyber team has been notified.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/sip-projects/:id/save-rejection – save rejection reason draft without submitting
router.put(
  '/:id/save-rejection',
  authorize(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.PROGRAMME_MANAGER, UserRole.DIRECTOR_HEAD_OF),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await SipProject.findByPk(req.params['id']);

      if (!project) {
        res.status(404).json({ success: false, message: 'SIP project not found' });
        return;
      }

      if (project.status !== SipProjectStatus.NEW) {
        res.status(400).json({ success: false, message: 'Only new projects can have a rejection draft saved' });
        return;
      }

      const { rejectionReasonDraft } = req.body;

      await project.update({
        rejectionReasonDraft: rejectionReasonDraft ?? null,
      });

      res.json({ success: true, message: 'Rejection reason draft saved.' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
