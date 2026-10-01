import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createContainerSchema, updateContainerSchema, setContainerLocationSchema, setLabelStatusSchema,
} from '../validators/containers';
import { nextContainerCode } from '../services/container-codes';
import { containerDisplay, formatContainerNumber, whereaboutsForOne } from '../services/whereabouts';
import { takeNextContainerNumber } from '../services/container-numbers';
import { config } from '../config';

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

// ── v2 (storage): container screen + moving a container ───────
// These must be registered BEFORE `/:id`, or Express would treat
// "by-number" as an id.

/**
 * Build the phone's container screen payload: the tote itself, where it
 * is (full location path), and everything currently inside it.
 */
async function containerScreen(where: { id: string } | { number: number }) {
  const container = await prisma.container.findUnique({
    where,
    include: {
      model: true,
      item: { include: { category: { include: { parent: true } } } },
      placements: {
        where: { removedAt: null },
        include: {
          item: {
            include: {
              category: { include: { parent: true } },
              container: { select: { id: true, number: true, label: true } },
            },
          },
        },
        orderBy: { placedAt: 'asc' },
      },
    },
  });
  if (!container || container.item.deletedAt) return null;

  const whereabouts = await whereaboutsForOne(container.item);
  const items = container.placements
    .filter((p) => !p.item.deletedAt)
    .map((p) => ({
      id: p.item.id,
      name: p.item.name,
      description: p.item.description,
      photoPath: p.item.photoPath,
      quantity: p.item.quantity,
      status: p.item.status,
      category: p.item.category,
      // Nested container (a tote inside a cedar chest)
      container: p.item.container,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    id: container.id,
    itemId: container.itemId,
    number: container.number,
    label: container.label,
    display: containerDisplay(container),
    name: container.item.name,
    description: container.item.description,
    photoPath: container.item.photoPath,
    category: container.item.category,
    status: container.status,
    labelStatus: container.labelStatus,
    lidColor: container.lidColor,
    bodyColor: container.bodyColor,
    model: container.model,
    locationId: container.locationId,
    whereabouts,
    // v2 labels (ADR-012): totes without a number are still on their old
    // handwritten label and need a new ID before a label can be printed.
    needsNewId: container.number == null,
    qrUrl: container.number != null ? containerQrUrl(container.number) : null,
    itemCount: items.length,
    items,
  };
}

/** What a tote's QR label encodes — a plain camera scan opens the admin site. */
function containerQrUrl(n: number): string {
  return `${config.publicAppUrl}/c/${String(n).padStart(3, '0')}`;
}

/**
 * GET /api/containers/by-number/:number
 * What a QR scan of a label ("…/c/12") resolves to.
 */
router.get('/by-number/:number', async (req: Request, res: Response) => {
  const number = Number(req.params.number);
  if (!Number.isInteger(number) || number < 0) {
    res.status(400).json({ error: 'Container number must be a whole number' });
    return;
  }
  const screen = await containerScreen({ number });
  if (!screen) {
    res.status(404).json({ error: `No container #${number}` });
    return;
  }
  res.json(screen);
});

/**
 * GET /api/containers/:id/screen
 * Same payload as by-number, looked up by id (older QR codes encode the id).
 */
router.get('/:id/screen', async (req: Request, res: Response) => {
  const screen = await containerScreen({ id: req.params.id as string });
  if (!screen) {
    res.status(404).json({ error: 'Container not found' });
    return;
  }
  res.json(screen);
});

/**
 * PATCH /api/containers/:id/location
 * Put a container at a spot (or clear it with null). A container with a
 * location counts as STORED.
 */
router.patch('/:id/location', validate(setContainerLocationSchema), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { locationId } = req.body as { locationId: string | null };

  const container = await prisma.container.findUnique({ where: { id } });
  if (!container) {
    res.status(404).json({ error: 'Container not found' });
    return;
  }
  if (locationId) {
    const loc = await prisma.location.findUnique({ where: { id: locationId } });
    if (!loc || loc.archivedAt || !loc.kind) {
      res.status(400).json({ error: 'Pick one of the current storage locations' });
      return;
    }
  }

  const updated = await prisma.container.update({
    where: { id },
    data: {
      locationId,
      // Moving a container onto a spot means it's stored there. Clearing the
      // spot leaves the status alone (it may be AWAY or still PACKING).
      ...(locationId && container.status !== 'AWAY' ? { status: 'STORED' as const } : {}),
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      action: 'MOVE_CONTAINER',
      entityType: 'Container',
      entityId: id,
      previousValue: { locationId: container.locationId },
      newValue: { locationId },
    },
  });

  res.json({ id: updated.id, locationId: updated.locationId, status: updated.status });
});

/**
 * POST /api/containers/:id/assign-number
 * Give a tote its new uniform ID ("#001", ADR-012) from the never-reused
 * counter. Only for totes that don't have one yet — a printed number is
 * permanent. The label then counts as NOT_PRINTED until marked printed.
 */
router.post('/:id/assign-number', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const container = await prisma.container.findUnique({ where: { id } });
  if (!container) {
    res.status(404).json({ error: 'Container not found' });
    return;
  }
  if (container.number != null) {
    res.status(409).json({ error: `This container already has ID ${formatContainerNumber(container.number)}` });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const number = await takeNextContainerNumber(tx);
    const c = await tx.container.update({
      where: { id },
      data: { number, labelStatus: 'NOT_PRINTED' },
    });
    await tx.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'ASSIGN_NUMBER',
        entityType: 'Container',
        entityId: id,
        previousValue: { label: container.label },
        newValue: { number },
      },
    });
    return c;
  });

  res.json({ id: updated.id, number: updated.number, display: formatContainerNumber(updated.number!), labelStatus: updated.labelStatus });
});

/**
 * PATCH /api/containers/:id/label-status
 * Mark a tote's label as printed (or back to "not printed" → reminders).
 */
router.patch('/:id/label-status', validate(setLabelStatusSchema), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { labelStatus } = req.body as { labelStatus: 'NOT_PRINTED' | 'PRINTED' };
  const container = await prisma.container.findUnique({ where: { id } });
  if (!container) {
    res.status(404).json({ error: 'Container not found' });
    return;
  }
  if (container.number == null) {
    res.status(400).json({ error: 'Assign a new ID before printing a label' });
    return;
  }
  const updated = await prisma.container.update({
    where: { id },
    data: { labelStatus, labelPrintedAt: labelStatus === 'PRINTED' ? new Date() : null },
  });
  res.json({ id: updated.id, labelStatus: updated.labelStatus, labelPrintedAt: updated.labelPrintedAt });
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
