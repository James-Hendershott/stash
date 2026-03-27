import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/activity
 * List recent activity logs. Supports pagination and filtering.
 */
router.get('/', async (req: Request, res: Response) => {
  const {
    entityType,
    entityId,
    userId,
    limit = '50',
    offset = '0',
  } = req.query;

  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string, 10), 100),
      skip: parseInt(offset as string, 10),
    }),
    prisma.activityLog.count({ where }),
  ]);

  res.json({ logs, total });
});

export default router;
