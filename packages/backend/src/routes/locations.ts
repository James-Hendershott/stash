import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createLocationSchema, updateLocationSchema } from '../validators/locations';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/locations
 * List all locations, optionally filtered by type.
 */
router.get('/', async (req: Request, res: Response) => {
  const { type } = req.query;
  const where: Record<string, unknown> = {};
  if (type) where.type = type;

  const locations = await prisma.location.findMany({
    where,
    include: {
      _count: {
        select: {
          originItems: { where: { deletedAt: null } },
          destinationItems: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  res.json(locations);
});

/**
 * GET /api/locations/:id
 * Get a single location with its item counts by fate.
 */
router.get('/:id', async (req: Request, res: Response) => {
  const location = await prisma.location.findUnique({
    where: { id: req.params.id },
    include: {
      originItems: {
        where: { deletedAt: null },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          originItems: { where: { deletedAt: null } },
          destinationItems: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!location) {
    res.status(404).json({ error: 'Location not found' });
    return;
  }

  res.json(location);
});

/**
 * POST /api/locations
 * Create a new location.
 */
router.post('/', validate(createLocationSchema), async (req: Request, res: Response) => {
  const location = await prisma.location.create({ data: req.body });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      action: 'CREATE',
      entityType: 'Location',
      entityId: location.id,
      newValue: { name: location.name, type: location.type },
    },
  });

  res.status(201).json(location);
});

/**
 * PATCH /api/locations/:id
 * Update a location.
 */
router.patch('/:id', validate(updateLocationSchema), async (req: Request, res: Response) => {
  const existing = await prisma.location.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Location not found' });
    return;
  }

  const location = await prisma.location.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.json(location);
});

/**
 * DELETE /api/locations/:id
 * Delete a location (only if no items reference it).
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const itemCount = await prisma.item.count({
    where: {
      OR: [
        { originLocationId: req.params.id },
        { destinationLocationId: req.params.id },
      ],
      deletedAt: null,
    },
  });

  if (itemCount > 0) {
    res.status(409).json({
      error: `Cannot delete location — ${itemCount} item(s) still reference it`,
    });
    return;
  }

  await prisma.location.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
