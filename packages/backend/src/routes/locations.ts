import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createLocationSchema, updateLocationSchema, createTreeLocationSchema } from '../validators/locations';
import { containerDisplay, loadLocationIndex, locationPath, pathLabel } from '../services/whereabouts';

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

// ── v2 (storage) location tree ────────────────────────────────
// Registered BEFORE `/:id` so "tree" / "unplaced" aren't read as ids.

/** Count of containers sitting directly at each location. */
async function containerCountsByLocation(): Promise<Map<string, number>> {
  const rows = await prisma.container.groupBy({
    by: ['locationId'],
    where: { locationId: { not: null }, item: { deletedAt: null } },
    _count: true,
  });
  return new Map(rows.map((r) => [r.locationId as string, r._count]));
}

/**
 * GET /api/locations/tree
 * All current (non-archived) v2 locations as a nested tree. Each node has
 * `containerCount` (directly there) and `totalContainers` (incl. children).
 * Postorder sum over the tree: O(L) for L locations.
 */
router.get('/tree', async (_req: Request, res: Response) => {
  const [locations, counts] = await Promise.all([
    prisma.location.findMany({
      where: { archivedAt: null, kind: { not: null } },
      select: { id: true, name: true, kind: true, shortCode: true, parentId: true, floor: true, notes: true, color: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    containerCountsByLocation(),
  ]);

  type Node = (typeof locations)[number] & { containerCount: number; totalContainers: number; children: Node[] };
  const nodes = new Map<string, Node>(
    locations.map((l) => [l.id, { ...l, containerCount: counts.get(l.id) ?? 0, totalContainers: 0, children: [] }]),
  );
  const roots: Node[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const total = (n: Node): number => (n.totalContainers = n.containerCount + n.children.reduce((s, c) => s + total(c), 0));
  roots.forEach(total);

  res.json(roots);
});

/**
 * GET /api/locations/unplaced
 * Containers that don't have a spot yet (and aren't packed inside another
 * container). These need a home.
 */
router.get('/unplaced', async (_req: Request, res: Response) => {
  const containers = await prisma.container.findMany({
    where: {
      locationId: null,
      item: { deletedAt: null, placements: { none: { removedAt: null } } },
    },
    include: {
      item: { select: { name: true, description: true } },
      _count: { select: { placements: { where: { removedAt: null } } } },
    },
    orderBy: [{ number: 'asc' }, { label: 'asc' }],
  });
  res.json(
    containers.map((c) => ({
      id: c.id, number: c.number, label: c.label, display: containerDisplay(c),
      name: c.item.name, description: c.item.description, lidColor: c.lidColor,
      status: c.status, itemCount: c._count.placements,
    })),
  );
});

/**
 * GET /api/locations/:id/contents
 * One location for the phone: its full path, sub-locations, containers
 * sitting here, and loose (non-container) items here.
 */
router.get('/:id/contents', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const index = await loadLocationIndex();
  const node = index.get(id);
  if (!node || node.archivedAt) {
    res.status(404).json({ error: 'Location not found' });
    return;
  }

  const [children, containers, looseItems, counts] = await Promise.all([
    prisma.location.findMany({
      where: { parentId: id, archivedAt: null },
      select: { id: true, name: true, kind: true, shortCode: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.container.findMany({
      where: { locationId: id, item: { deletedAt: null } },
      include: {
        item: { select: { name: true, description: true } },
        _count: { select: { placements: { where: { removedAt: null } } } },
      },
      orderBy: [{ number: 'asc' }, { label: 'asc' }],
    }),
    prisma.item.findMany({
      where: { locationId: id, deletedAt: null, isContainer: false },
      select: { id: true, name: true, photoPath: true, quantity: true, status: true },
      orderBy: { name: 'asc' },
    }),
    containerCountsByLocation(),
  ]);

  // Total containers under a child (child + its descendants).
  const childTotal = (childId: string): number => {
    let sum = counts.get(childId) ?? 0;
    for (const n of index.values()) if (n.parentId === childId && !n.archivedAt) sum += childTotal(n.id);
    return sum;
  };

  const path = locationPath(index, id);
  res.json({
    id: node.id,
    name: node.name,
    kind: node.kind,
    shortCode: node.shortCode,
    path: pathLabel(path),
    breadcrumbs: path.map((p) => ({ id: p.id, name: p.name })),
    children: children.map((c) => ({ ...c, totalContainers: childTotal(c.id) })),
    containers: containers.map((c) => ({
      id: c.id, number: c.number, label: c.label, display: containerDisplay(c),
      name: c.item.name, description: c.item.description, lidColor: c.lidColor,
      status: c.status, itemCount: c._count.placements,
    })),
    looseItems,
  });
});

/**
 * POST /api/locations/tree
 * Create a new spot (or area/place) in the v2 tree — used when storing a
 * container somewhere that doesn't exist yet.
 */
router.post('/tree', validate(createTreeLocationSchema), async (req: Request, res: Response) => {
  const { name, parentId, kind, shortCode, notes } = req.body;
  if (parentId) {
    const parent = await prisma.location.findUnique({ where: { id: parentId } });
    if (!parent || parent.archivedAt || !parent.kind) {
      res.status(400).json({ error: 'Parent location not found' });
      return;
    }
  }
  if (shortCode) {
    const taken = await prisma.location.findUnique({ where: { shortCode } });
    if (taken) {
      res.status(409).json({ error: `Short code ${shortCode} is already used by "${taken.name}"` });
      return;
    }
  }
  const siblings = await prisma.location.count({ where: { parentId } });
  const location = await prisma.location.create({
    data: { name, parentId, kind, shortCode: shortCode || null, notes: notes ?? null, sortOrder: siblings },
  });
  res.status(201).json(location);
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
