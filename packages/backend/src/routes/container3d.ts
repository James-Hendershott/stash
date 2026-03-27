import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/containers/:id/3d
 * Returns container dimensions and item dimensions/fates for 3D rendering.
 */
router.get('/:id/3d', async (req: Request, res: Response) => {
  const container = await prisma.container.findUnique({
    where: { id: req.params.id },
    include: {
      item: { select: { name: true, fate: true } },
      placements: {
        where: { removedAt: null },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              fate: true,
              lengthIn: true,
              widthIn: true,
              heightIn: true,
              weightLbs: true,
            },
          },
        },
      },
    },
  });

  if (!container) {
    res.status(404).json({ error: 'Container not found' });
    return;
  }

  res.json({
    container: {
      id: container.id,
      label: container.label,
      containerType: container.containerType,
      internalLengthIn: container.internalLengthIn,
      internalWidthIn: container.internalWidthIn,
      internalHeightIn: container.internalHeightIn,
      maxWeightLbs: container.maxWeightLbs,
    },
    items: container.placements.map((p) => ({
      id: p.item.id,
      name: p.item.name,
      fate: p.item.fate,
      lengthIn: p.item.lengthIn,
      widthIn: p.item.widthIn,
      heightIn: p.item.heightIn,
      weightLbs: p.item.weightLbs,
    })),
  });
});

export default router;
