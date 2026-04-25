import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createContainerSchema, updateContainerSchema } from '../validators/containers';
import { nextContainerCode } from '../services/container-codes';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/containers
 * List all containers with their item info and placement counts.
 */
router.get('/', async (req: Request, res: Response) => {
  const containers = await prisma.container.findMany({
    include: {
      item: {
        include: {
          originLocation: true,
          destinationLocation: true,
        },
      },
      placements: {
        where: { removedAt: null },
        include: {
          item: { select: { id: true, name: true, fate: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Add computed fields
  const result = containers.map((c) => ({
    ...c,
    activeItemCount: c.placements.length,
  }));

  res.json(result);
});

/**
 * GET /api/containers/:id
 * Get a single container with all its current and past placements.
 */
router.get('/:id', async (req: Request, res: Response) => {
  const container = await prisma.container.findUnique({
    where: { id: req.params.id },
    include: {
      item: {
        include: {
          originLocation: true,
          destinationLocation: true,
          addedBy: { select: { id: true, name: true } },
        },
      },
      placements: {
        include: {
          item: {
            select: {
              id: true, name: true, fate: true, condition: true,
              lengthIn: true, widthIn: true, heightIn: true, weightLbs: true,
            },
          },
          placedBy: { select: { id: true, name: true } },
        },
        orderBy: { placedAt: 'desc' },
      },
    },
  });

  if (!container) {
    res.status(404).json({ error: 'Container not found' });
    return;
  }

  res.json(container);
});

/**
 * POST /api/containers
 * Create a new container (creates both the Item and Container records).
 */
router.post('/', validate(createContainerSchema), async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const {
    name, description, categoryId, originLocationId, destinationLocationId, fate, notes,
    containerType, label, internalLengthIn, internalWidthIn, internalHeightIn, maxWeightLbs,
  } = req.body;

  // Create both in a transaction so they either both succeed or both fail.
  // Container.label is the auto-generated unique code (T27-0012, BXS-0001,
  // etc.). If the caller passed an explicit `label`, honor it as a
  // preferred number when the format is parseable; otherwise let the
  // helper pick the next available code.
  const result = await prisma.$transaction(async (tx) => {
    const preferredNumber = parsePreferredNumber(label);
    const { code } = await nextContainerCode(tx, containerType, preferredNumber);

    const item = await tx.item.create({
      data: {
        name,
        description,
        categoryId,
        originLocationId,
        destinationLocationId,
        fate,
        notes,
        isContainer: true,
        lengthIn: internalLengthIn,
        widthIn: internalWidthIn,
        heightIn: internalHeightIn,
        shapeType: 'BOX',
        addedById: userId,
        lastModifiedById: userId,
      },
    });

    const container = await tx.container.create({
      data: {
        itemId: item.id,
        containerType,
        label: code,
        internalLengthIn,
        internalWidthIn,
        internalHeightIn,
        maxWeightLbs,
      },
    });

    return { ...container, item };
  });

  await prisma.activityLog.create({
    data: {
      userId,
      action: 'CREATE',
      entityType: 'Container',
      entityId: result.id,
      newValue: { label: result.label, type: result.containerType },
    },
  });

  res.status(201).json(result);
});

/**
 * PATCH /api/containers/:id
 * Update a container and/or its underlying item.
 */
router.patch('/:id', validate(updateContainerSchema), async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const {
    name, description, categoryId, originLocationId, destinationLocationId, fate, notes,
    containerType, label, internalLengthIn, internalWidthIn, internalHeightIn, maxWeightLbs,
  } = req.body;

  const existing = await prisma.container.findUnique({
    where: { id: req.params.id },
    include: { item: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Container not found' });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update the item fields (if provided)
    const itemData: Record<string, unknown> = { lastModifiedById: userId };
    if (name !== undefined) itemData.name = name;
    if (description !== undefined) itemData.description = description;
    if (categoryId !== undefined) itemData.categoryId = categoryId;
    if (originLocationId !== undefined) itemData.originLocationId = originLocationId;
    if (destinationLocationId !== undefined) itemData.destinationLocationId = destinationLocationId;
    if (fate !== undefined) itemData.fate = fate;
    if (notes !== undefined) itemData.notes = notes;

    const item = await tx.item.update({
      where: { id: existing.itemId },
      data: itemData,
    });

    // Update the container fields (if provided)
    const containerData: Record<string, unknown> = {};
    if (containerType !== undefined) containerData.containerType = containerType;
    if (label !== undefined) containerData.label = label;
    if (internalLengthIn !== undefined) containerData.internalLengthIn = internalLengthIn;
    if (internalWidthIn !== undefined) containerData.internalWidthIn = internalWidthIn;
    if (internalHeightIn !== undefined) containerData.internalHeightIn = internalHeightIn;
    if (maxWeightLbs !== undefined) containerData.maxWeightLbs = maxWeightLbs;

    const container = Object.keys(containerData).length > 0
      ? await tx.container.update({ where: { id: req.params.id }, data: containerData })
      : existing;

    return { ...container, item };
  });

  res.json(result);
});

// If the caller's `label` looks like "Tote #12" or "T27-0012" or just
// "12", extract the numeric portion as the preferred sequence number.
// Returns undefined if no number can be parsed.
function parsePreferredNumber(label: unknown): number | undefined {
  if (typeof label !== 'string') return undefined;
  const m = label.match(/(\d+)/);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default router;
