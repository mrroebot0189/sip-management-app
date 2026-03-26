import { Router, Request, Response, NextFunction } from 'express';
import { Department } from '../models';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();
router.use(authenticate);

function parseProjectOwners(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [raw];
  } catch {
    return raw ? [raw] : [];
  }
}

function mapDepartment(dept: Department) {
  const d = dept.toJSON() as unknown as Record<string, unknown>;
  const projectOwners = parseProjectOwners(d['projectManager'] as string | undefined);
  return { ...d, projectOwners };
}

// GET /api/departments - all authenticated users can fetch the list (needed for dropdowns)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await Department.findAll({
      order: [['name', 'ASC']],
    });
    res.json({ success: true, data: departments.map(mapDepartment) });
  } catch (err) {
    next(err);
  }
});

// POST /api/departments - admin only
router.post('/', authorize(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, chief, director, projectOwners, contactEmail } = req.body;
    const projectOwnersArr: string[] = Array.isArray(projectOwners) ? projectOwners.filter((v: unknown) => typeof v === 'string' && v.trim()) : [];

    const missing: string[] = [];
    if (!name || !name.trim()) missing.push('Department name');
    if (!chief || !chief.trim()) missing.push('Chief');
    if (!director || !director.trim()) missing.push('Director');
    if (projectOwnersArr.length === 0) missing.push('Project Owner (at least one)');
    if (missing.length > 0) {
      res.status(400).json({ success: false, message: `The following fields are required: ${missing.join(', ')}` });
      return;
    }

    const existing = await Department.findOne({ where: { name: name.trim() } });
    if (existing) {
      res.status(409).json({ success: false, message: 'A department with that name already exists' });
      return;
    }

    const department = await Department.create({
      name: name.trim(),
      chief: chief.trim(),
      director: director.trim(),
      projectManager: JSON.stringify(projectOwnersArr),
      ...(contactEmail?.trim() && { contactEmail: contactEmail.trim() }),
    });
    res.status(201).json({ success: true, data: mapDepartment(department) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/departments/:id - admin only
router.put('/:id', authorize(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const department = await Department.findByPk(req.params['id']);
    if (!department) {
      res.status(404).json({ success: false, message: 'Department not found' });
      return;
    }

    const { name, chief, director, projectOwners, contactEmail } = req.body;
    const projectOwnersArr: string[] = Array.isArray(projectOwners) ? projectOwners.filter((v: unknown) => typeof v === 'string' && v.trim()) : [];

    const missing: string[] = [];
    if (!name || !name.trim()) missing.push('Department name');
    if (!chief || !chief.trim()) missing.push('Chief');
    if (!director || !director.trim()) missing.push('Director');
    if (projectOwnersArr.length === 0) missing.push('Project Owner (at least one)');
    if (missing.length > 0) {
      res.status(400).json({ success: false, message: `The following fields are required: ${missing.join(', ')}` });
      return;
    }

    // Check name uniqueness if name changed
    if (name.trim() !== department.name) {
      const existing = await Department.findOne({ where: { name: name.trim() } });
      if (existing) {
        res.status(409).json({ success: false, message: 'A department with that name already exists' });
        return;
      }
    }

    await department.update({
      name: name.trim(),
      chief: chief.trim(),
      director: director.trim(),
      projectManager: JSON.stringify(projectOwnersArr),
      contactEmail: contactEmail?.trim() || null,
    });

    res.json({ success: true, data: mapDepartment(department) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/departments/:id - admin only
router.delete('/:id', authorize(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const department = await Department.findByPk(req.params['id']);
    if (!department) {
      res.status(404).json({ success: false, message: 'Department not found' });
      return;
    }
    await department.destroy();
    res.json({ success: true, message: 'Department deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
