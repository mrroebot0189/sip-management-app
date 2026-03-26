import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models';
import { authenticate, generateToken } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

const getNameFromEmail = (email: string): { firstName: string; lastName: string } => {
  const localPart = email.split('@')[0] || '';
  const normalized = localPart
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (normalized.length >= 2) {
    const [firstWord, ...rest] = normalized;
    return {
      firstName: firstWord,
      lastName: rest.join(' '),
    };
  }

  if (normalized.length === 1) {
    return {
      firstName: normalized[0],
      lastName: 'Admin',
    };
  }

  return {
    firstName: 'Platform',
    lastName: 'Admin',
  };
};

// POST /api/auth/register
router.post(
  '/register',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid role'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { firstName, lastName, email, password, role } = req.body;

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        res.status(409).json({ success: false, message: 'Email already in use' });
        return;
      }

      const user = await User.create({
        firstName,
        lastName,
        email,
        passwordHash: password,
        role: role || UserRole.PROJECT_OWNER,
      });

      const token = generateToken({ userId: user.id, email: user.email, role: user.role });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user: user.toJSON(), token },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/admin-signup
router.post(
  '/admin-signup',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { email, password } = req.body as { email: string; password: string };

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        res.status(409).json({ success: false, message: 'Email already in use' });
        return;
      }

      const { firstName, lastName } = getNameFromEmail(email);
      const user = await User.create({
        firstName,
        lastName,
        email,
        passwordHash: password,
        role: UserRole.ADMIN,
      });

      const token = generateToken({ userId: user.id, email: user.email, role: user.role });

      res.status(201).json({
        success: true,
        message: 'Admin account created successfully',
        data: { user: user.toJSON(), token },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { email, password } = req.body;

      const user = await User.findOne({ where: { email, isActive: true } });
      if (!user || !(await user.validatePassword(password))) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      user.lastLoginAt = new Date();
      await user.save();

      const token = generateToken({ userId: user.id, email: user.email, role: user.role });

      res.json({
        success: true,
        message: 'Login successful',
        data: { user: user.toJSON(), token },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByPk(req.user!.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

export default router;
