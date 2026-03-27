import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/stats
 * Dashboard summary statistics.
 */
router.get('/', async (_req: Request, res: Response) => {
  const [
    totalItems,
    fateBreakdown,
    categoryBreakdown,
    containerCount,
    locationCount,
  ] = await Promise.all([
    prisma.item.count({ where: { deletedAt: null } }),
    prisma.item.groupBy({
      by: ['fate'],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.item.groupBy({
      by: ['categoryId'],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.container.count(),
    prisma.location.count(),
  ]);

  // Calculate estimated sale total
  const sellItems = await prisma.item.aggregate({
    where: { fate: 'SELL', deletedAt: null },
    _sum: { estimatedSaleValue: true },
    _count: true,
  });

  res.json({
    totalItems,
    fateBreakdown: fateBreakdown.map((f) => ({ fate: f.fate, count: f._count })),
    categoryBreakdown,
    containerCount,
    locationCount,
    sellSummary: {
      count: sellItems._count,
      estimatedTotal: sellItems._sum.estimatedSaleValue ?? 0,
    },
  });
});

export default router;
