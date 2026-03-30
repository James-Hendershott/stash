import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createUserSchema, updateUserSchema, resetPasswordSchema } from '../validators/users';

const router = Router();

// All user management routes require admin
router.use(requireAuth, requireAdmin);

/**
 * GET /api/users
 * List all users with activity counts.
 */
router.get('/', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          addedItems: { where: { deletedAt: null } },
          activityLogs: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json(users);
});

/**
 * POST /api/users
 * Create a new user (admin only).
 */
router.post('/', validate(createUserSchema), async (req: Request, res: Response) => {
  const { email, name, password, role } = req.body;

  // Check for duplicate email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'A user with this email already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role,
      mustChangePassword: true,
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      newValue: { email: user.email, name: user.name, role: user.role },
    },
  });

  res.status(201).json(user);
});

/**
 * PATCH /api/users/:id
 * Update a user's name, email, or role.
 */
router.patch('/:id', validate(updateUserSchema), async (req: Request, res: Response) => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Prevent demoting the last admin
  if (req.body.role === 'USER' && existing.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      res.status(400).json({ error: 'Cannot remove the last admin' });
      return;
    }
  }

  // Check email uniqueness if changing
  if (req.body.email && req.body.email !== existing.email) {
    const duplicate = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (duplicate) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: req.body,
    select: { id: true, email: true, name: true, role: true },
  });

  res.json(user);
});

/**
 * POST /api/users/:id/reset-password
 * Admin resets a user's password (forces mustChangePassword on next login).
 */
router.post('/:id/reset-password', validate(resetPasswordSchema), async (req: Request, res: Response) => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const passwordHash = await bcrypt.hash(req.body.newPassword, 10);

  await prisma.user.update({
    where: { id: req.params.id },
    data: { passwordHash, mustChangePassword: true },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      action: 'RESET_PASSWORD',
      entityType: 'User',
      entityId: req.params.id,
      newValue: { targetUser: existing.email },
    },
  });

  res.json({ message: `Password reset for ${existing.email}. They must change it on next login.` });
});

/**
 * DELETE /api/users/:id
 * Delete a user (admin only). Cannot delete yourself or the last admin.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  if (req.params.id === req.user!.userId) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (existing.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      res.status(400).json({ error: 'Cannot delete the last admin' });
      return;
    }
  }

  // Check if user has items — reassign to current admin instead of deleting
  const itemCount = await prisma.item.count({
    where: { OR: [{ addedById: req.params.id }, { lastModifiedById: req.params.id }] },
  });

  if (itemCount > 0) {
    // Reassign items to the requesting admin
    await prisma.item.updateMany({
      where: { addedById: req.params.id },
      data: { addedById: req.user!.userId },
    });
    await prisma.item.updateMany({
      where: { lastModifiedById: req.params.id },
      data: { lastModifiedById: req.user!.userId },
    });
  }

  await prisma.user.delete({ where: { id: req.params.id } });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      action: 'DELETE',
      entityType: 'User',
      entityId: req.params.id,
      previousValue: { email: existing.email, name: existing.name },
    },
  });

  res.status(204).send();
});

export default router;
