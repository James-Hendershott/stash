import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPlacementSchema } from '../validators/placements';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/placements
 * List placements, optionally filtered by containerId or itemId.
 */
router.get('/', async (req: Request, res: Response) => {
  const { containerId, itemId, active } = req.query;
  const where: Record<string, unknown> = {};

  if (containerId) where.containerId = containerId;
  if (itemId) where.itemId = itemId;
  if (active === 'true') where.removedAt = null;

  const placements = await prisma.itemPlacement.findMany({
    where,
    include: {
      item: { select: { id: true, name: true, fate: true, condition: true } },
      container: {
        select: { id: true, label: true, containerType: true },
      },
      placedBy: { select: { id: true, name: true } },
    },
    orderBy: { placedAt: 'desc' },
  });

  res.json(placements);
});

/**
 * POST /api/placements
 * Place an item into a container.
 */
router.post('/', validate(createPlacementSchema), async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { itemId, containerId, notes } = req.body;

  // Verify item exists and is not itself a container
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item || item.deletedAt) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  if (item.isContainer) {
    res.status(400).json({ error: 'Cannot place a container inside another container' });
    return;
  }

  // Verify container exists
  const container = await prisma.container.findUnique({ where: { id: containerId } });
  if (!container) {
    res.status(404).json({ error: 'Container not found' });
    return;
  }

  // Check if item is already actively placed in this container
  const existing = await prisma.itemPlacement.findFirst({
    where: { itemId, containerId, removedAt: null },
  });
  if (existing) {
    res.status(409).json({ error: 'Item is already in this container' });
    return;
  }

  const placement = await prisma.itemPlacement.create({
    data: {
      itemId,
      containerId,
      placedById: userId,
      notes,
    },
    include: {
      item: { select: { id: true, name: true } },
      container: { select: { id: true, label: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      userId,
      action: 'PLACE',
      entityType: 'ItemPlacement',
      entityId: placement.id,
      newValue: { itemName: item.name, containerLabel: container.label },
    },
  });

  res.status(201).json(placement);
});

/**
 * PATCH /api/placements/:id/remove
 * Remove an item from a container (sets removedAt).
 */
router.patch('/:id/remove', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const placement = await prisma.itemPlacement.findUnique({
    where: { id: req.params.id },
    include: {
      item: { select: { name: true } },
      container: { select: { label: true } },
    },
  });

  if (!placement) {
    res.status(404).json({ error: 'Placement not found' });
    return;
  }

  if (placement.removedAt) {
    res.status(400).json({ error: 'Item has already been removed from this container' });
    return;
  }

  const updated = await prisma.itemPlacement.update({
    where: { id: req.params.id },
    data: { removedAt: new Date() },
  });

  await prisma.activityLog.create({
    data: {
      userId,
      action: 'REMOVE',
      entityType: 'ItemPlacement',
      entityId: placement.id,
      previousValue: { itemName: placement.item.name, containerLabel: placement.container.label },
    },
  });

  res.json(updated);
});

export default router;
