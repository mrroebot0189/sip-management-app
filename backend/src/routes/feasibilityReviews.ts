import { Router, Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { SipProject, Department, User } from '../models';
import FeasibilityReview, { FeasibilityReviewStatus, FeasibilityReviewConclusion } from '../models/FeasibilityReview';
import { authenticate } from '../middleware/auth';
import { SipProjectStatus, UserRole } from '../types';
import {
  sendFeasibilityReviewerEmail,
  sendFeasibilityReviewSubmittedEmail,
  sendDirectorFeasibilityRejectionEmail,
  sendFeasibilityAcceptedEmail,
  sendPlanningStartNotificationEmail,
} from '../services/emailService';

const router = Router();
router.use(authenticate);

const isStatusConstraintError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('status') && message.includes('constraint');
};

const moveProjectToPlanningStatus = async (
  project: SipProject,
  additionalFields: Record<string, unknown>
): Promise<SipProjectStatus.IN_PLANNING | SipProjectStatus.FEASIBILITY_ACCEPTED> => {
  try {
    await project.update({
      status: SipProjectStatus.IN_PLANNING,
      ...additionalFields,
    });
    return SipProjectStatus.IN_PLANNING;
  } catch (error) {
    // Some deployments still enforce a legacy DB status check that allows
    // `feasibility_accepted` but not `in_planning`. Fall back so projects
    // can still progress without a server error.
    if (!isStatusConstraintError(error)) {
      throw error;
    }

    await project.update({
      status: SipProjectStatus.FEASIBILITY_ACCEPTED,
      ...additionalFields,
    });
    return SipProjectStatus.FEASIBILITY_ACCEPTED;
  }
};

// GET /api/feasibility-reviews
// Returns all projects in Feasibility Assessment (or legacy under_review) assigned to the current user
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;

    // Admins, programme managers and cyber see everything;
    // Directors/director_head_of only see projects assigned to them as reviewer;
    // all others also see only their assigned projects
    const seesAll =
      role === UserRole.ADMIN ||
      role === UserRole.PROGRAMME_MANAGER ||
      role === UserRole.CYBER;

    // Query without status filtering at the DB layer because some environments still
    // use legacy enum values (under_review) while others use feasibility_assessment.
    // Filtering in code avoids enum-cast query failures during mixed-schema rollouts.
    const where = seesAll ? undefined : { feasibilityReviewerId: userId };

    const allProjects = await SipProject.findAll({
      ...(where ? { where } : {}),
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['feasibilityReviewerAssignedAt', 'DESC']],
    });

    const projects = allProjects.filter(
      (p) => p.status === SipProjectStatus.FEASIBILITY_ASSESSMENT || p.status === SipProjectStatus.UNDER_REVIEW
    );

    // Attach existing review drafts
    const projectIds = projects.map((p) => p.id);
    const reviews = projectIds.length
      ? await FeasibilityReview.findAll({ where: { sipProjectId: { [Op.in]: projectIds } } })
      : [];
    const reviewMap: Record<string, FeasibilityReview> = {};
    for (const r of reviews) {
      reviewMap[r.sipProjectId] = r;
    }

    const data = projects.map((p) => ({
      ...(p.toJSON() as object),
      feasibilityReview: reviewMap[p.id] ?? null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/feasibility-reviews/submitted
// Returns projects under_review whose feasibility review has been submitted – awaiting director decision
router.get('/submitted', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.user!;

    const isDirector =
      role === UserRole.ADMIN ||
      role === UserRole.DIRECTOR ||
      role === UserRole.PROGRAMME_MANAGER ||
      role === UserRole.DIRECTOR_HEAD_OF;

    if (!isDirector) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const allProjects = await SipProject.findAll({
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['feasibilityReviewerAssignedAt', 'DESC']],
    });

    const projects = allProjects.filter(
      (p) => p.status === SipProjectStatus.FEASIBILITY_ASSESSMENT || p.status === SipProjectStatus.UNDER_REVIEW
    );

    const projectIds = projects.map((p) => p.id);
    const reviews = projectIds.length
      ? await FeasibilityReview.findAll({
          where: { sipProjectId: { [Op.in]: projectIds }, status: FeasibilityReviewStatus.SUBMITTED },
        })
      : [];

    const reviewMap: Record<string, FeasibilityReview> = {};
    for (const r of reviews) {
      reviewMap[r.sipProjectId] = r;
    }

    // Only include projects where the review has been submitted
    const data = projects
      .filter((p) => reviewMap[p.id])
      .map((p) => ({ ...(p.toJSON() as object), feasibilityReview: reviewMap[p.id] }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/feasibility-reviews/cyber-review
// Returns projects with status feasibility_rejected or rejected – awaiting cyber decision
router.get('/cyber-review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.user!;

    const isCyberOrAdmin = role === UserRole.CYBER || role === UserRole.ADMIN;
    if (!isCyberOrAdmin) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const projects = await SipProject.findAll({
      where: { status: { [Op.in]: [SipProjectStatus.FEASIBILITY_REJECTED, SipProjectStatus.REJECTED] } },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'rejectedBy', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['updatedAt', 'DESC']],
    });

    const projectIds = projects.map((p) => p.id);
    const reviews = projectIds.length
      ? await FeasibilityReview.findAll({ where: { sipProjectId: { [Op.in]: projectIds } } })
      : [];
    const reviewMap: Record<string, FeasibilityReview> = {};
    for (const r of reviews) {
      reviewMap[r.sipProjectId] = r;
    }

    const data = projects.map((p) => ({ ...(p.toJSON() as object), feasibilityReview: reviewMap[p.id] ?? null }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/feasibility-reviews/non-implementing
// Returns projects with status non_implementing
router.get('/non-implementing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.user!;

    const isAllowed =
      role === UserRole.CYBER ||
      role === UserRole.ADMIN ||
      role === UserRole.DIRECTOR ||
      role === UserRole.DIRECTOR_HEAD_OF ||
      role === UserRole.PROGRAMME_MANAGER;

    if (!isAllowed) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const projects = await SipProject.findAll({
      where: { status: SipProjectStatus.NON_IMPLEMENTING },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['cyberReportedAt', 'DESC']],
    });

    const projectIds = projects.map((p) => p.id);
    const reviews = projectIds.length
      ? await FeasibilityReview.findAll({ where: { sipProjectId: { [Op.in]: projectIds } } })
      : [];
    const reviewMap: Record<string, FeasibilityReview> = {};
    for (const r of reviews) {
      reviewMap[r.sipProjectId] = r;
    }

    const data = projects.map((p) => ({ ...(p.toJSON() as object), feasibilityReview: reviewMap[p.id] ?? null }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/feasibility-reviews/:projectId
// Get review data for a specific project
router.get('/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    const { projectId } = req.params;

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
      role === UserRole.DIRECTOR_HEAD_OF;

    if (!isPrivileged && project.feasibilityReviewerId?.toLowerCase() !== userId.toLowerCase()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const review = await FeasibilityReview.findOne({ where: { sipProjectId: projectId } });

    res.json({
      success: true,
      data: {
        ...(project.toJSON() as object),
        feasibilityReview: review ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feasibility-reviews/:projectId/save
// Save (or update) review draft without submitting
router.post('/:projectId/save', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    const { projectId } = req.params;

    const isPrivileged =
      role === UserRole.ADMIN ||
      role === UserRole.DIRECTOR ||
      role === UserRole.PROGRAMME_MANAGER ||
      role === UserRole.DIRECTOR_HEAD_OF ||
      role === UserRole.CYBER;

    const project = await SipProject.findByPk(projectId);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    if (!isPrivileged && project.feasibilityReviewerId?.toLowerCase() !== userId.toLowerCase()) {
      res.status(403).json({ success: false, message: 'Access denied – you are not the assigned reviewer' });
      return;
    }

    if (
      project.status !== SipProjectStatus.FEASIBILITY_ASSESSMENT &&
      project.status !== SipProjectStatus.UNDER_REVIEW
    ) {
      res.status(400).json({ success: false, message: 'Project is not under feasibility assessment' });
      return;
    }

    const {
      suggestedSolution,
      understandProblem,
      estimatedDuration,
      estimatedEffort,
      setupCosts,
      annualOngoingCost,
      setupResources,
      annualOngoingResources,
      additionalResources,
      potentialRisks,
      potentialDependencies,
      potentialConstraints,
      conclusion,
    } = req.body;

    const parseText = (val: unknown): string => {
      if (typeof val !== 'string') return '';
      return val.trim();
    };

    const parseBoolean = (val: unknown, fallback = false): boolean => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return fallback;
    };

    const parseNumeric = (val: unknown): number | null => {
      if (val === null || val === undefined || val === '') return null;
      const n = Number(val);
      return Number.isFinite(n) ? n : null;
    };

    // Only accept known enum values – treat empty string / unknown values as null in DB.
    const parseConclusion = (val: unknown): FeasibilityReviewConclusion | null => {
      if (typeof val !== 'string' || !val) return null;
      return Object.values(FeasibilityReviewConclusion).includes(val as FeasibilityReviewConclusion)
        ? (val as FeasibilityReviewConclusion)
        : null;
    };

    let review = await FeasibilityReview.findOne({ where: { sipProjectId: projectId } });

    if (review) {
      if (review.status === 'submitted') {
        res.status(400).json({ success: false, message: 'Review has already been submitted' });
        return;
      }

      const updates: Record<string, unknown> = {};
      if (suggestedSolution !== undefined) updates.suggestedSolution = parseText(suggestedSolution);
      if (understandProblem !== undefined) updates.understandProblem = parseBoolean(understandProblem, review.understandProblem);
      if (estimatedDuration !== undefined) updates.estimatedDuration = parseText(estimatedDuration);
      if (estimatedEffort !== undefined) updates.estimatedEffort = parseText(estimatedEffort);
      if (setupCosts !== undefined) updates.setupCosts = parseNumeric(setupCosts);
      if (annualOngoingCost !== undefined) updates.annualOngoingCost = parseNumeric(annualOngoingCost);
      if (setupResources !== undefined) updates.setupResources = parseNumeric(setupResources);
      if (annualOngoingResources !== undefined) updates.annualOngoingResources = parseNumeric(annualOngoingResources);
      if (additionalResources !== undefined) updates.additionalResources = parseNumeric(additionalResources);
      if (potentialRisks !== undefined) updates.potentialRisks = parseText(potentialRisks);
      if (potentialDependencies !== undefined) updates.potentialDependencies = parseText(potentialDependencies);
      if (potentialConstraints !== undefined) updates.potentialConstraints = parseText(potentialConstraints);
      if (conclusion !== undefined) updates.conclusion = parseConclusion(conclusion);

      await review.update(updates);
    } else {
      review = await FeasibilityReview.create({
        sipProjectId: projectId,
        reviewerId: userId,
        suggestedSolution: parseText(suggestedSolution),
        understandProblem: parseBoolean(understandProblem),
        estimatedDuration: parseText(estimatedDuration),
        estimatedEffort: parseText(estimatedEffort),
        setupCosts: parseNumeric(setupCosts),
        annualOngoingCost: parseNumeric(annualOngoingCost),
        setupResources: parseNumeric(setupResources),
        annualOngoingResources: parseNumeric(annualOngoingResources),
        additionalResources: parseNumeric(additionalResources),
        potentialRisks: parseText(potentialRisks),
        potentialDependencies: parseText(potentialDependencies),
        potentialConstraints: parseText(potentialConstraints),
        conclusion: parseConclusion(conclusion),
      });
    }

    res.json({ success: true, data: review, message: 'Review draft saved.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/feasibility-reviews/:projectId/submit
// Submit the review – notifies the director
router.post('/:projectId/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    const { projectId } = req.params;

    const isPrivileged =
      role === UserRole.ADMIN ||
      role === UserRole.DIRECTOR ||
      role === UserRole.PROGRAMME_MANAGER ||
      role === UserRole.DIRECTOR_HEAD_OF ||
      role === UserRole.CYBER;

    const project = await SipProject.findByPk(projectId, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'contactEmail'] },
        { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    if (!isPrivileged && project.feasibilityReviewerId?.toLowerCase() !== userId.toLowerCase()) {
      res.status(403).json({ success: false, message: 'Access denied – you are not the assigned reviewer' });
      return;
    }

    if (
      project.status !== SipProjectStatus.FEASIBILITY_ASSESSMENT &&
      project.status !== SipProjectStatus.UNDER_REVIEW
    ) {
      res.status(400).json({ success: false, message: 'Project is not under feasibility assessment' });
      return;
    }

    const {
      suggestedSolution,
      understandProblem,
      estimatedDuration,
      estimatedEffort,
      setupCosts,
      annualOngoingCost,
      setupResources,
      annualOngoingResources,
      additionalResources,
      potentialRisks,
      potentialDependencies,
      potentialConstraints,
      conclusion,
    } = req.body;

    const parseText = (val: unknown): string => {
      if (typeof val !== 'string') return '';
      return val.trim();
    };

    const parseBoolean = (val: unknown): boolean => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return false;
    };

    // Validate required fields
    if (!conclusion || !Object.values(FeasibilityReviewConclusion).includes(conclusion)) {
      res.status(400).json({ success: false, message: 'A conclusion is required' });
      return;
    }

    const parseNumeric = (val: unknown): number | null => {
      if (val === null || val === undefined || val === '') return null;
      const n = Number(val);
      return isNaN(n) ? null : n;
    };

    let review = await FeasibilityReview.findOne({ where: { sipProjectId: projectId } });

    if (review) {
      if (review.status === 'submitted') {
        res.status(400).json({ success: false, message: 'Review has already been submitted' });
        return;
      }
      await review.update({
        suggestedSolution: parseText(suggestedSolution),
        understandProblem: parseBoolean(understandProblem),
        estimatedDuration: parseText(estimatedDuration),
        estimatedEffort: parseText(estimatedEffort),
        setupCosts: parseNumeric(setupCosts),
        annualOngoingCost: parseNumeric(annualOngoingCost),
        setupResources: parseNumeric(setupResources),
        annualOngoingResources: parseNumeric(annualOngoingResources),
        additionalResources: parseNumeric(additionalResources),
        potentialRisks: parseText(potentialRisks),
        potentialDependencies: parseText(potentialDependencies),
        potentialConstraints: parseText(potentialConstraints),
        conclusion,
        status: FeasibilityReviewStatus.SUBMITTED,
        submittedAt: new Date(),
      });
    } else {
      review = await FeasibilityReview.create({
        sipProjectId: projectId,
        reviewerId: userId,
        suggestedSolution: parseText(suggestedSolution),
        understandProblem: parseBoolean(understandProblem),
        estimatedDuration: parseText(estimatedDuration),
        estimatedEffort: parseText(estimatedEffort),
        setupCosts: parseNumeric(setupCosts),
        annualOngoingCost: parseNumeric(annualOngoingCost),
        setupResources: parseNumeric(setupResources),
        annualOngoingResources: parseNumeric(annualOngoingResources),
        additionalResources: parseNumeric(additionalResources),
        potentialRisks: parseText(potentialRisks),
        potentialDependencies: parseText(potentialDependencies),
        potentialConstraints: parseText(potentialConstraints),
        conclusion,
        status: FeasibilityReviewStatus.SUBMITTED,
        submittedAt: new Date(),
      });
    }

    // Notify the director/approver
    const reviewer = project.get('feasibilityReviewer') as User | null;
    const dept = project.get('department') as Department | null;

    // Get directors to notify
    try {
      const directors = await User.findAll({
        where: { role: [UserRole.DIRECTOR, UserRole.DIRECTOR_HEAD_OF], isActive: true },
        attributes: ['id', 'firstName', 'lastName', 'email'],
      });

      for (const director of directors) {
        await sendFeasibilityReviewSubmittedEmail({
          toEmail: director.email,
          directorName: `${director.firstName} ${director.lastName}`,
          reviewerName: reviewer
            ? `${reviewer.firstName} ${reviewer.lastName}`
            : 'Project Head',
          improvementTitle: project.improvementTitle,
          departmentName: dept?.name ?? '',
          projectId: project.id,
        });
      }
    } catch (emailErr) {
      console.error('[Email] Failed to notify director of feasibility review submission:', emailErr);
    }

    res.json({
      success: true,
      data: review,
      message: 'Feasibility review submitted. The director has been notified.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feasibility-reviews/:projectId/director-accept
// Director accepts the feasibility review – progresses project to planning
router.post('/:projectId/director-accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;

    const isDirector =
      role === UserRole.ADMIN ||
      role === UserRole.DIRECTOR ||
      role === UserRole.PROGRAMME_MANAGER ||
      role === UserRole.DIRECTOR_HEAD_OF;

    if (!isDirector) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const { projectId } = req.params;

    const project = await SipProject.findByPk(projectId, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    if (
      project.status !== SipProjectStatus.FEASIBILITY_ASSESSMENT &&
      project.status !== SipProjectStatus.UNDER_REVIEW
    ) {
      res.status(400).json({ success: false, message: 'Project must be in feasibility assessment to accept feasibility' });
      return;
    }

    // Check the review has been submitted
    const review = await FeasibilityReview.findOne({ where: { sipProjectId: projectId } });
    if (!review || review.status !== FeasibilityReviewStatus.SUBMITTED) {
      res.status(400).json({ success: false, message: 'Feasibility review must be submitted before a decision can be made' });
      return;
    }

    await moveProjectToPlanningStatus(project, {
      feasibilityAcceptedById: userId,
      feasibilityAcceptedAt: new Date(),
    });

    // Notify creator (cyber team) and feasibility reviewer
    const acceptor = await User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName'] });
    const acceptorName = acceptor ? `${acceptor.firstName} ${acceptor.lastName}` : 'Director';
    const dept = project.get('department') as Department | null;
    const creator = project.get('createdBy') as User | null;
    const reviewer = project.get('feasibilityReviewer') as User | null;

    const notifyEmails: { email: string; name: string }[] = [];
    if (creator?.email) notifyEmails.push({ email: creator.email, name: `${creator.firstName} ${creator.lastName}` });
    if (reviewer?.email && reviewer.id !== creator?.id) {
      notifyEmails.push({ email: reviewer.email, name: `${reviewer.firstName} ${reviewer.lastName}` });
    }

    try {
      for (const recipient of notifyEmails) {
        await sendFeasibilityAcceptedEmail({
          toEmail: recipient.email,
          recipientName: recipient.name,
          improvementTitle: project.improvementTitle,
          departmentName: dept?.name ?? '',
          acceptedByName: acceptorName,
          projectId: project.id,
        });
      }
    } catch (emailErr) {
      console.error('[Email] Failed to send feasibility accepted notification:', emailErr);
    }

    // Send planning start notification to the feasibility reviewer
    if (reviewer?.email) {
      try {
        await sendPlanningStartNotificationEmail({
          toEmail: reviewer.email,
          recipientName: `${reviewer.firstName} ${reviewer.lastName}`,
          improvementTitle: project.improvementTitle,
          departmentName: dept?.name ?? '',
          projectId: project.id,
        });
      } catch (emailErr) {
        console.error('[Email] Failed to send planning start notification:', emailErr);
      }
    }

    res.json({
      success: true,
      message: 'Feasibility accepted. Project is now proceeding to planning.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feasibility-reviews/:projectId/director-reject
// Director rejects the feasibility review – notifies cyber security for secondary review
router.post('/:projectId/director-reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;

    const isDirector =
      role === UserRole.ADMIN ||
      role === UserRole.DIRECTOR ||
      role === UserRole.PROGRAMME_MANAGER ||
      role === UserRole.DIRECTOR_HEAD_OF;

    if (!isDirector) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const { projectId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason?.trim()) {
      res.status(400).json({ success: false, message: 'Rejection reason is required' });
      return;
    }

    const project = await SipProject.findByPk(projectId, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    if (
      project.status !== SipProjectStatus.FEASIBILITY_ASSESSMENT &&
      project.status !== SipProjectStatus.UNDER_REVIEW
    ) {
      res.status(400).json({ success: false, message: 'Project must be in feasibility assessment to reject feasibility' });
      return;
    }

    const review = await FeasibilityReview.findOne({ where: { sipProjectId: projectId } });
    if (!review || review.status !== FeasibilityReviewStatus.SUBMITTED) {
      res.status(400).json({ success: false, message: 'Feasibility review must be submitted before a decision can be made' });
      return;
    }

    const rejector = await User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName'] });
    const directorName = rejector ? `${rejector.firstName} ${rejector.lastName}` : 'Director';

    await project.update({
      status: SipProjectStatus.FEASIBILITY_REJECTED,
      feasibilityRejectedById: userId,
      feasibilityRejectedAt: new Date(),
      feasibilityRejectionReason: rejectionReason.trim(),
    });

    // Notify all cyber team members
    const dept = project.get('department') as Department | null;
    try {
      const cyberTeam = await User.findAll({
        where: { role: UserRole.CYBER, isActive: true },
        attributes: ['id', 'firstName', 'lastName', 'email'],
      });

      for (const cyberMember of cyberTeam) {
        await sendDirectorFeasibilityRejectionEmail({
          toEmail: cyberMember.email,
          cyberName: `${cyberMember.firstName} ${cyberMember.lastName}`,
          improvementTitle: project.improvementTitle,
          departmentName: dept?.name ?? '',
          rejectionReason: rejectionReason.trim(),
          directorName,
          projectId: project.id,
        });
      }
    } catch (emailErr) {
      console.error('[Email] Failed to send feasibility rejection notification to cyber:', emailErr);
    }

    res.json({
      success: true,
      message: 'Feasibility rejected. Cyber Security has been notified to review the decision.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feasibility-reviews/:projectId/cyber-accept
// Cyber Security overrides director rejection – progresses project to planning
router.post('/:projectId/cyber-accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;

    const isCyberOrAdmin = role === UserRole.CYBER || role === UserRole.ADMIN;
    if (!isCyberOrAdmin) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const { projectId } = req.params;

    const project = await SipProject.findByPk(projectId, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    if (
      project.status !== SipProjectStatus.FEASIBILITY_REJECTED &&
      project.status !== SipProjectStatus.REJECTED
    ) {
      res.status(400).json({ success: false, message: 'Project must be in rejected status for cyber override' });
      return;
    }

    const isNewProjectRejection = project.status === SipProjectStatus.REJECTED;
    if (isNewProjectRejection) {
      await project.update({
        status: SipProjectStatus.FEASIBILITY_ASSESSMENT,
        cyberAcceptedById: userId,
        cyberAcceptedAt: new Date(),
      });
    } else {
      await moveProjectToPlanningStatus(project, {
        cyberAcceptedById: userId,
        cyberAcceptedAt: new Date(),
      });
    }

    // Notify directors and project creator
    const acceptor = await User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName'] });
    const acceptorName = acceptor ? `${acceptor.firstName} ${acceptor.lastName}` : 'Cyber Security';
    const dept = project.get('department') as Department | null;
    const creator = project.get('createdBy') as User | null;
    const reviewer = project.get('feasibilityReviewer') as User | null;

    const notifyEmails: { email: string; name: string }[] = [];
    if (creator?.email) notifyEmails.push({ email: creator.email, name: `${creator.firstName} ${creator.lastName}` });
    if (reviewer?.email && reviewer.id !== creator?.id) {
      notifyEmails.push({ email: reviewer.email, name: `${reviewer.firstName} ${reviewer.lastName}` });
    }

    try {
      const directors = await User.findAll({
        where: { role: [UserRole.DIRECTOR, UserRole.DIRECTOR_HEAD_OF], isActive: true },
        attributes: ['id', 'firstName', 'lastName', 'email'],
      });
      for (const d of directors) {
        notifyEmails.push({ email: d.email, name: `${d.firstName} ${d.lastName}` });
      }

      for (const recipient of notifyEmails) {
        await sendFeasibilityAcceptedEmail({
          toEmail: recipient.email,
          recipientName: recipient.name,
          improvementTitle: project.improvementTitle,
          departmentName: dept?.name ?? '',
          acceptedByName: acceptorName,
          projectId: project.id,
        });
      }
    } catch (emailErr) {
      console.error('[Email] Failed to send cyber-accepted notification:', emailErr);
    }

    const successMessage = isNewProjectRejection
      ? 'Cyber Security has overridden the rejection. Project has been moved to Feasibility Review.'
      : 'Cyber Security has overridden the rejection. Project has been moved to Planning.';

    res.json({
      success: true,
      message: successMessage,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feasibility-reviews/:projectId/cyber-report
// Cyber Security agrees project is not feasible – moves to non-implementing
router.post('/:projectId/cyber-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;

    const isCyberOrAdmin = role === UserRole.CYBER || role === UserRole.ADMIN;
    if (!isCyberOrAdmin) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const { projectId } = req.params;

    const project = await SipProject.findByPk(projectId);

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    if (
      project.status !== SipProjectStatus.FEASIBILITY_REJECTED &&
      project.status !== SipProjectStatus.REJECTED
    ) {
      res.status(400).json({ success: false, message: 'Project must be in rejected status to mark as non-implementing' });
      return;
    }

    await project.update({
      status: SipProjectStatus.NON_IMPLEMENTING,
      cyberReportedById: userId,
      cyberReportedAt: new Date(),
    });

    res.json({
      success: true,
      message: 'Project marked as non-implementing and saved for board reporting.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feasibility-reviews/bulk-cyber-accept
// Cyber Security overrides director rejection in bulk – progresses multiple projects to planning
router.post('/bulk-cyber-accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;

    const isCyberOrAdmin = role === UserRole.CYBER || role === UserRole.ADMIN;
    if (!isCyberOrAdmin) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const { projectIds } = req.body;
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      res.status(400).json({ success: false, message: 'projectIds array is required' });
      return;
    }

    const results: { id: string; success: boolean; message: string }[] = [];

    for (const projectId of projectIds) {
      try {
        const project = await SipProject.findByPk(projectId, {
          include: [
            { model: Department, as: 'department', attributes: ['id', 'name'] },
            { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
            { model: User, as: 'feasibilityReviewer', attributes: ['id', 'firstName', 'lastName', 'email'] },
          ],
        });

        if (!project) {
          results.push({ id: projectId, success: false, message: 'Project not found' });
          continue;
        }

        if (
          project.status !== SipProjectStatus.FEASIBILITY_REJECTED &&
          project.status !== SipProjectStatus.REJECTED
        ) {
          results.push({ id: projectId, success: false, message: 'Project is not in a rejected status' });
          continue;
        }

        const isBulkNewProjectRejection = project.status === SipProjectStatus.REJECTED;
        if (isBulkNewProjectRejection) {
          await project.update({
            status: SipProjectStatus.FEASIBILITY_ASSESSMENT,
            cyberAcceptedById: userId,
            cyberAcceptedAt: new Date(),
          });
        } else {
          await moveProjectToPlanningStatus(project, {
            cyberAcceptedById: userId,
            cyberAcceptedAt: new Date(),
          });
        }

        const acceptor = await User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName'] });
        const acceptorName = acceptor ? `${acceptor.firstName} ${acceptor.lastName}` : 'Cyber Security';
        const dept = project.get('department') as Department | null;
        const creator = project.get('createdBy') as User | null;
        const reviewer = project.get('feasibilityReviewer') as User | null;

        const notifyEmails: { email: string; name: string }[] = [];
        if (creator?.email) notifyEmails.push({ email: creator.email, name: `${creator.firstName} ${creator.lastName}` });
        if (reviewer?.email && reviewer.id !== creator?.id) {
          notifyEmails.push({ email: reviewer.email, name: `${reviewer.firstName} ${reviewer.lastName}` });
        }

        try {
          const directors = await User.findAll({
            where: { role: [UserRole.DIRECTOR, UserRole.DIRECTOR_HEAD_OF], isActive: true },
            attributes: ['id', 'firstName', 'lastName', 'email'],
          });
          for (const d of directors) {
            notifyEmails.push({ email: d.email, name: `${d.firstName} ${d.lastName}` });
          }

          for (const recipient of notifyEmails) {
            await sendFeasibilityAcceptedEmail({
              toEmail: recipient.email,
              recipientName: recipient.name,
              improvementTitle: project.improvementTitle,
              departmentName: dept?.name ?? '',
              acceptedByName: acceptorName,
              projectId: project.id,
            });
          }
        } catch (emailErr) {
          console.error('[Email] Failed to send bulk cyber-accepted notification:', emailErr);
        }

        results.push({
          id: projectId,
          success: true,
          message: isBulkNewProjectRejection ? 'Overridden – moved to Feasibility Review' : 'Overridden – moved to Planning',
        });
      } catch (err) {
        results.push({ id: projectId, success: false, message: 'Unexpected error' });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    res.json({
      success: true,
      data: results,
      message: `${succeeded} of ${projectIds.length} projects overridden and moved to Planning.`,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feasibility-reviews/bulk-cyber-report
// Cyber Security marks multiple projects as non-implementing in bulk
router.post('/bulk-cyber-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;

    const isCyberOrAdmin = role === UserRole.CYBER || role === UserRole.ADMIN;
    if (!isCyberOrAdmin) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const { projectIds } = req.body;
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      res.status(400).json({ success: false, message: 'projectIds array is required' });
      return;
    }

    const results: { id: string; success: boolean; message: string }[] = [];

    for (const projectId of projectIds) {
      try {
        const project = await SipProject.findByPk(projectId);

        if (!project) {
          results.push({ id: projectId, success: false, message: 'Project not found' });
          continue;
        }

        if (
          project.status !== SipProjectStatus.FEASIBILITY_REJECTED &&
          project.status !== SipProjectStatus.REJECTED
        ) {
          results.push({ id: projectId, success: false, message: 'Project is not in a rejected status' });
          continue;
        }

        await project.update({
          status: SipProjectStatus.NON_IMPLEMENTING,
          cyberReportedById: userId,
          cyberReportedAt: new Date(),
        });

        results.push({ id: projectId, success: true, message: 'Marked as non-implementing' });
      } catch (err) {
        results.push({ id: projectId, success: false, message: 'Unexpected error' });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    res.json({
      success: true,
      data: results,
      message: `${succeeded} of ${projectIds.length} projects marked as non-implementing.`,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feasibility-reviews/:projectId/cyber-assign
// Assign a feasibility reviewer to a cyber-accepted project
router.post('/:projectId/cyber-assign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.user!;

    const isAllowed =
      role === UserRole.CYBER ||
      role === UserRole.ADMIN ||
      role === UserRole.DIRECTOR ||
      role === UserRole.PROGRAMME_MANAGER ||
      role === UserRole.DIRECTOR_HEAD_OF;

    if (!isAllowed) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const { projectId } = req.params;
    const { feasibilityReviewerId } = req.body;

    if (!feasibilityReviewerId) {
      res.status(400).json({ success: false, message: 'feasibilityReviewerId is required' });
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

    if (project.status !== SipProjectStatus.FEASIBILITY_ASSESSMENT || !project.cyberAcceptedAt) {
      res.status(400).json({ success: false, message: 'Project must be a cyber-accepted project in feasibility assessment' });
      return;
    }

    const reviewer = await User.findByPk(feasibilityReviewerId, {
      attributes: ['id', 'firstName', 'lastName', 'email'],
    });

    if (!reviewer) {
      res.status(404).json({ success: false, message: 'Reviewer not found' });
      return;
    }

    await project.update({
      feasibilityReviewerId,
      feasibilityReviewerAssignedAt: new Date(),
    });

    res.json({
      success: true,
      message: `Feasibility reviewer assigned successfully.`,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feasibility-reviews/:projectId/return-to-feasibility
// Allows a privileged user to send a cyber-overridden project back to feasibility
// so the feasibility information can be edited before proceeding to planning again
router.post('/:projectId/return-to-feasibility', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.user!;

    const isAllowed =
      role === UserRole.ADMIN ||
      role === UserRole.DIRECTOR ||
      role === UserRole.DIRECTOR_HEAD_OF ||
      role === UserRole.PROGRAMME_MANAGER ||
      role === UserRole.CYBER;

    if (!isAllowed) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const { projectId } = req.params;

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

    const planningStatuses = [
      SipProjectStatus.FEASIBILITY_ACCEPTED,
      SipProjectStatus.IN_PLANNING,
    ];

    if (!planningStatuses.includes(project.status)) {
      res.status(400).json({ success: false, message: 'Project must be in planning to return to feasibility' });
      return;
    }

    if (!project.cyberAcceptedAt) {
      res.status(400).json({ success: false, message: 'Only projects that were overridden by Cyber Security can be returned to feasibility' });
      return;
    }

    await project.update({
      status: SipProjectStatus.FEASIBILITY_ASSESSMENT,
    });

    // Notify the feasibility reviewer if one is assigned
    const reviewer = project.get('feasibilityReviewer') as User | null;
    const dept = project.get('department') as Department | null;
    if (reviewer?.email) {
      try {
        await sendFeasibilityReviewerEmail({
          toEmail: reviewer.email,
          reviewerName: `${reviewer.firstName} ${reviewer.lastName}`,
          improvementTitle: project.improvementTitle,
          departmentName: dept?.name ?? '',
          projectId: project.id,
        });
      } catch (emailErr) {
        console.error('[Email] Failed to send return-to-feasibility notification:', emailErr);
      }
    }

    res.json({
      success: true,
      message: 'Project has been returned to Feasibility Review for editing.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
