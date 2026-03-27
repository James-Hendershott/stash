import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createItemSchema, updateItemSchema, updateItemFateSchema } from '../validators/items';

const router = Router();

// All item routes require authentication
router.use(requireAuth);

/**
 * GET /api/items
 * List all active items. Supports filtering by query params.
 */
router.get('/', async (req: Request, res: Response) => {
  const {
    fate,
    categoryId,
    locationId,
    isContainer,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const where: Record<string, unknown> = { deletedAt: null };

  if (fate) where.fate = fate;
  if (categoryId) where.categoryId = categoryId;
  if (locationId) where.originLocationId = locationId;
  if (isContainer !== undefined) where.isContainer = isContainer === 'true';
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { notes: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const items = await prisma.item.findMany({
    where,
    include: {
      category: true,
      originLocation: true,
      destinationLocation: true,
      container: true,
      addedBy: { select: { id: true, name: true } },
    },
    orderBy: { [sortBy as string]: sortOrder },
  });

  res.json(items);
});

/**
 * GET /api/items/:id
 * Get a single item with all relations.
 */
router.get('/:id', async (req: Request, res: Response) => {
  const item = await prisma.item.findUnique({
    where: { id: req.params.id },
    include: {
      category: true,
      originLocation: true,
      destinationLocation: true,
      container: true,
      placements: {
        include: {
          container: { include: { item: { select: { name: true } } } },
          placedBy: { select: { id: true, name: true } },
        },
        orderBy: { placedAt: 'desc' },
      },
      addedBy: { select: { id: true, name: true } },
      lastModifiedBy: { select: { id: true, name: true } },
    },
  });

  if (!item || item.deletedAt) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  res.json(item);
});

/**
 * POST /api/items
 * Create a new item.
 */
router.post('/', validate(createItemSchema), async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const item = await prisma.item.create({
    data: {
      ...req.body,
      addedById: userId,
      lastModifiedById: userId,
    },
    include: { category: true, originLocation: true },
  });

  await prisma.activityLog.create({
    data: {
      userId,
      action: 'CREATE',
      entityType: 'Item',
      entityId: item.id,
      newValue: { name: item.name, fate: item.fate },
    },
  });

  res.status(201).json(item);
});

/**
 * PATCH /api/items/:id
 * Update an item's fields.
 */
router.patch('/:id', validate(updateItemSchema), async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const existing = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  const item = await prisma.item.update({
    where: { id: req.params.id },
    data: {
      ...req.body,
      lastModifiedById: userId,
    },
    include: { category: true, originLocation: true },
  });

  await prisma.activityLog.create({
    data: {
      userId,
      action: 'UPDATE',
      entityType: 'Item',
      entityId: item.id,
      previousValue: { name: existing.name, fate: existing.fate },
      newValue: { name: item.name, fate: item.fate },
    },
  });

  res.json(item);
});

/**
 * PATCH /api/items/:id/fate
 * Quick-update just the fate (and optionally sale value).
 */
router.patch('/:id/fate', validate(updateItemFateSchema), async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const existing = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  const item = await prisma.item.update({
    where: { id: req.params.id },
    data: {
      fate: req.body.fate,
      estimatedSaleValue: req.body.estimatedSaleValue ?? existing.estimatedSaleValue,
      lastModifiedById: userId,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId,
      action: 'UPDATE_FATE',
      entityType: 'Item',
      entityId: item.id,
      previousValue: { fate: existing.fate },
      newValue: { fate: item.fate },
    },
  });

  res.json(item);
});

/**
 * DELETE /api/items/:id
 * Soft-delete an item (sets deletedAt).
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const existing = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  await prisma.item.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date(), lastModifiedById: userId },
  });

  await prisma.activityLog.create({
    data: {
      userId,
      action: 'DELETE',
      entityType: 'Item',
      entityId: req.params.id,
      previousValue: { name: existing.name },
    },
  });

  res.status(204).send();
});

export default router;
