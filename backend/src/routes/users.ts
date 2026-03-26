import { Router, Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import { User, SipProject, ProjectStatusUpdate, ProjectPlan, ProjectMilestone, FeasibilityReview } from '../models';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();
router.use(authenticate);

const removeUserFromSystem = async (userId: string) => {
  await sequelize.transaction(async (transaction) => {
    const userProjects = await SipProject.findAll({
      where: { createdById: userId },
      attributes: ['id'],
      transaction,
    });

    const projectIds = userProjects.map((project) => project.id);

    if (projectIds.length > 0) {
      await ProjectStatusUpdate.destroy({
        where: { sipProjectId: { [Op.in]: projectIds } },
        transaction,
      });

      const plans = await ProjectPlan.findAll({
        where: { sipProjectId: { [Op.in]: projectIds } },
        attributes: ['id'],
        transaction,
      });
      const planIds = plans.map((plan) => plan.id);

      if (planIds.length > 0) {
        await ProjectMilestone.destroy({
          where: { projectPlanId: { [Op.in]: planIds } },
          transaction,
        });
      }

      await ProjectPlan.destroy({ where: { sipProjectId: { [Op.in]: projectIds } }, transaction });
      await FeasibilityReview.destroy({ where: { sipProjectId: { [Op.in]: projectIds } }, transaction });
      await SipProject.destroy({ where: { id: { [Op.in]: projectIds } }, transaction });
    }

    // Remove references to this user from remaining records so the user can be deleted safely
    await SipProject.update({ approvedById: null } as any, { where: { approvedById: userId }, transaction });
    await SipProject.update({ rejectedById: null } as any, { where: { rejectedById: userId }, transaction });
    await SipProject.update({ feasibilityReviewerId: null } as any, { where: { feasibilityReviewerId: userId }, transaction });
    await SipProject.update({ feasibilityAcceptedById: null } as any, { where: { feasibilityAcceptedById: userId }, transaction });
    await SipProject.update({ feasibilityRejectedById: null } as any, { where: { feasibilityRejectedById: userId }, transaction });
    await SipProject.update({ cyberAcceptedById: null } as any, { where: { cyberAcceptedById: userId }, transaction });
    await SipProject.update({ cyberReportedById: null } as any, { where: { cyberReportedById: userId }, transaction });

    await ProjectStatusUpdate.destroy({ where: { submittedById: userId }, transaction });
    await FeasibilityReview.destroy({ where: { reviewerId: userId }, transaction });

    await ProjectPlan.update({ directorReviewedById: null } as any, { where: { directorReviewedById: userId }, transaction });
    await ProjectPlan.update({ cyberApprovedById: null } as any, { where: { cyberApprovedById: userId }, transaction });
    await ProjectPlan.update({ cyberReviewedById: null } as any, { where: { cyberReviewedById: userId }, transaction });

    await User.destroy({ where: { id: userId }, transaction });
  });
};

// GET /api/users/for-departments – list active users for department form dropdowns
// Returns only users with roles relevant to department assignment (chief, director, project_owner)
router.get(
  '/for-departments',
  authorize(UserRole.ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await User.findAll({
        where: {
          isActive: true,
          role: [UserRole.CHIEF, UserRole.DIRECTOR, UserRole.DIRECTOR_HEAD_OF, UserRole.PROJECT_OWNER],
        },
        attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
        order: [['firstName', 'ASC'], ['lastName', 'ASC']],
      });
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/users/for-review – list active users available for feasibility review assignment
// Accessible by directors and admins to populate the reviewer dropdown
router.get(
  '/for-review',
  authorize(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.DIRECTOR_HEAD_OF, UserRole.PROGRAMME_MANAGER),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await User.findAll({
        where: { isActive: true },
        attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
        order: [['firstName', 'ASC'], ['lastName', 'ASC']],
      });
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/users (admin only - create a new user)
router.post('/', authorize(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    const missing: string[] = [];
    if (!firstName || !String(firstName).trim()) missing.push('First name');
    if (!lastName || !String(lastName).trim()) missing.push('Last name');
    if (!email || !String(email).trim()) missing.push('Email');
    if (!password || String(password).length < 8) missing.push('Password (min 8 characters)');
    if (missing.length > 0) {
      res.status(400).json({ success: false, message: `The following fields are required: ${missing.join(', ')}` });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).trim())) {
      res.status(400).json({ success: false, message: 'Valid email address is required' });
      return;
    }

    if (role && !Object.values(UserRole).includes(role as UserRole)) {
      res.status(400).json({ success: false, message: 'Invalid role' });
      return;
    }

    const existing = await User.findOne({ where: { email: String(email).trim().toLowerCase() } });
    if (existing) {
      res.status(409).json({ success: false, message: 'Email already in use' });
      return;
    }

    const { departmentId } = req.body;

    const user = await User.create({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: String(email).trim().toLowerCase(),
      passwordHash: String(password),
      role: (role as UserRole) || UserRole.PROJECT_OWNER,
      departmentId: departmentId || null,
    });

    res.status(201).json({ success: true, message: 'User created successfully', data: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

// GET /api/users (admin only - list all users)
router.get('/', authorize(UserRole.ADMIN, UserRole.DIRECTOR_HEAD_OF), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.findAll({
      where: { isActive: true },
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'departmentId', 'createdAt'],
      order: [['firstName', 'ASC'], ['lastName', 'ASC']],
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Users can only view their own profile unless admin/PM
    if (req.user!.userId !== req.params['id'] &&
      ![UserRole.ADMIN, UserRole.DIRECTOR_HEAD_OF].includes(req.user!.role)) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const user = await User.findByPk(req.params['id']);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.userId !== req.params['id'] && req.user!.role !== UserRole.ADMIN) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const user = await User.findByPk(req.params['id']);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Non-admins cannot change their own role
    const allowedFields: string[] = ['firstName', 'lastName'];
    if (req.user!.role === UserRole.ADMIN) allowedFields.push('role', 'isActive', 'departmentId');

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (req.user!.role === UserRole.ADMIN && req.body.isActive === false) {
      await removeUserFromSystem(user.id);
      res.json({ success: true, message: 'User and related records removed from the system' });
      return;
    }

    if (req.body.password) updates['passwordHash'] = req.body.password;

    await user.update(updates);
    res.json({ success: true, message: 'User updated', data: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id (hard delete)
router.delete('/:id', authorize(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params['id'];

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    await removeUserFromSystem(userId);

    res.json({ success: true, message: 'User and related records removed from the system' });
  } catch (err) {
    next(err);
  }
});

export default router;
