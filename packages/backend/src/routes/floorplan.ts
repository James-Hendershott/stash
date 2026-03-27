import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/floorplan/:house
 * Returns all locations for a house with floor plan coordinates and
 * item counts broken down by fate — used to render the floor plan overlay.
 *
 * Query: ?house=Colorado Home  (URL-encoded)
 */
router.get('/:house', async (req: Request, res: Response) => {
  const house = decodeURIComponent(req.params.house);

  const locations = await prisma.location.findMany({
    where: { house },
    orderBy: { sortOrder: 'asc' },
  });

  // Get item counts per location per fate
  const fateCountsRaw = await prisma.item.groupBy({
    by: ['originLocationId', 'fate'],
    where: { deletedAt: null, originLocationId: { in: locations.map((l) => l.id) } },
    _count: true,
  });

  // Build a map: locationId → { KEEP: 3, SELL: 1, ... }
  const fateMap = new Map<string, Record<string, number>>();
  for (const row of fateCountsRaw) {
    if (!fateMap.has(row.originLocationId)) fateMap.set(row.originLocationId, {});
    fateMap.get(row.originLocationId)![row.fate] = row._count;
  }

  const result = locations.map((loc) => {
    const fates = fateMap.get(loc.id) || {};
    const totalItems = Object.values(fates).reduce((sum, n) => sum + n, 0);

    return {
      id: loc.id,
      name: loc.name,
      type: loc.type,
      floor: loc.floor,
      color: loc.color,
      sortOrder: loc.sortOrder,
      floorPlanX: loc.floorPlanX,
      floorPlanY: loc.floorPlanY,
      floorPlanWidth: loc.floorPlanWidth,
      floorPlanHeight: loc.floorPlanHeight,
      totalItems,
      fateCounts: fates,
    };
  });

  // Group by floor
  const floors = new Map<string, typeof result>();
  for (const loc of result) {
    if (!floors.has(loc.floor)) floors.set(loc.floor, []);
    floors.get(loc.floor)!.push(loc);
  }

  res.json({
    house,
    floors: Array.from(floors.entries()).map(([floor, rooms]) => ({
      floor,
      rooms,
    })),
  });
});

/**
 * PATCH /api/floorplan/room/:id/position
 * Update a room's floor plan coordinates (for drag-and-drop placement).
 */
router.patch('/room/:id/position', async (req: Request, res: Response) => {
  const { floorPlanX, floorPlanY, floorPlanWidth, floorPlanHeight } = req.body;

  const location = await prisma.location.findUnique({ where: { id: req.params.id } });
  if (!location) {
    res.status(404).json({ error: 'Location not found' });
    return;
  }

  const updated = await prisma.location.update({
    where: { id: req.params.id },
    data: {
      floorPlanX: floorPlanX ?? location.floorPlanX,
      floorPlanY: floorPlanY ?? location.floorPlanY,
      floorPlanWidth: floorPlanWidth ?? location.floorPlanWidth,
      floorPlanHeight: floorPlanHeight ?? location.floorPlanHeight,
    },
  });

  res.json(updated);
});

export default router;
