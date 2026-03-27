import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

/**
 * POST /api/sync/pull
 *
 * WatermelonDB pull sync endpoint. Returns all records that changed
 * since the given lastPulledAt timestamp.
 *
 * Request body: { lastPulledAt: number | null }
 * - null on first sync (returns everything)
 * - millisecond timestamp on subsequent syncs
 *
 * Response: {
 *   changes: { items: { created, updated, deleted }, ... },
 *   timestamp: number
 * }
 */
router.post('/pull', async (req: Request, res: Response) => {
  const { lastPulledAt } = req.body;
  const since = lastPulledAt ? new Date(lastPulledAt) : new Date(0);
  const now = new Date();

  // Items — include related data flattened for the mobile DB
  const changedItems = await prisma.item.findMany({
    where: { updatedAt: { gt: since } },
    include: {
      category: { select: { name: true, color: true } },
      originLocation: { select: { name: true } },
      destinationLocation: { select: { name: true } },
    },
  });

  const activeItems = changedItems.filter((i) => !i.deletedAt);
  const deletedItems = changedItems.filter((i) => i.deletedAt);
  const isFirstSync = !lastPulledAt;

  const itemsCreated = isFirstSync ? activeItems : activeItems.filter((i) => i.createdAt > since);
  const itemsUpdated = isFirstSync ? [] : activeItems.filter((i) => i.createdAt <= since);

  // Containers
  const changedContainers = await prisma.container.findMany({
    where: { updatedAt: { gt: since } },
  });
  const containersCreated = isFirstSync ? changedContainers : changedContainers.filter((c) => c.createdAt > since);
  const containersUpdated = isFirstSync ? [] : changedContainers.filter((c) => c.createdAt <= since);

  // Locations (rarely change, but sync them)
  const changedLocations = await prisma.location.findMany({
    where: { updatedAt: { gt: since } },
  });
  const locationsCreated = isFirstSync ? changedLocations : changedLocations.filter((l) => l.createdAt > since);
  const locationsUpdated = isFirstSync ? [] : changedLocations.filter((l) => l.createdAt <= since);

  // Categories
  const changedCategories = await prisma.category.findMany({
    where: { updatedAt: { gt: since } },
  });
  const categoriesCreated = isFirstSync ? changedCategories : changedCategories.filter((c) => c.createdAt > since);
  const categoriesUpdated = isFirstSync ? [] : changedCategories.filter((c) => c.createdAt <= since);

  function mapItem(item: any) {
    return {
      id: item.id,
      server_id: item.id,
      name: item.name,
      description: item.description,
      category_id: item.categoryId,
      category_name: item.category?.name || null,
      category_color: item.category?.color || null,
      condition: item.condition,
      quantity: item.quantity,
      length_in: item.lengthIn,
      width_in: item.widthIn,
      height_in: item.heightIn,
      weight_lbs: item.weightLbs,
      shape_type: item.shapeType,
      fate: item.fate,
      origin_location_id: item.originLocationId,
      origin_location_name: item.originLocation?.name || null,
      destination_location_id: item.destinationLocationId,
      destination_location_name: item.destinationLocation?.name || null,
      photo_path: item.photoPath,
      qr_code_path: item.qrCodePath,
      is_container: item.isContainer,
      estimated_sale_value: item.estimatedSaleValue,
      llm_price_suggestion: item.llmPriceSuggestion,
      llm_price_rationale: item.llmPriceRationale,
      notes: item.notes,
      created_at: item.createdAt.getTime(),
      updated_at: item.updatedAt.getTime(),
    };
  }

  function mapContainer(c: any) {
    return {
      id: c.id,
      server_id: c.id,
      item_id: c.itemId,
      container_type: c.containerType,
      label: c.label,
      internal_length_in: c.internalLengthIn,
      internal_width_in: c.internalWidthIn,
      internal_height_in: c.internalHeightIn,
      max_weight_lbs: c.maxWeightLbs,
      created_at: c.createdAt.getTime(),
      updated_at: c.updatedAt.getTime(),
    };
  }

  function mapLocation(l: any) {
    return {
      id: l.id,
      server_id: l.id,
      name: l.name,
      type: l.type,
      house: l.house,
      floor: l.floor,
      color: l.color,
      sort_order: l.sortOrder,
    };
  }

  function mapCategory(c: any) {
    return {
      id: c.id,
      server_id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
    };
  }

  res.json({
    changes: {
      items: {
        created: itemsCreated.map(mapItem),
        updated: itemsUpdated.map(mapItem),
        deleted: deletedItems.map((i) => i.id),
      },
      containers: {
        created: containersCreated.map(mapContainer),
        updated: containersUpdated.map(mapContainer),
        deleted: [],
      },
      locations: {
        created: locationsCreated.map(mapLocation),
        updated: locationsUpdated.map(mapLocation),
        deleted: [],
      },
      categories: {
        created: categoriesCreated.map(mapCategory),
        updated: categoriesUpdated.map(mapCategory),
        deleted: [],
      },
    },
    timestamp: now.getTime(),
  });
});

/**
 * POST /api/sync/push
 *
 * WatermelonDB push sync endpoint. Receives local changes
 * from the mobile app and applies them to the server database.
 *
 * Request body: { changes: { items: { created, updated, deleted } }, lastPulledAt: number }
 */
router.post('/push', async (req: Request, res: Response) => {
  const { changes } = req.body;
  const userId = req.user!.userId;

  // Process item changes
  if (changes.items) {
    // Created items
    for (const item of changes.items.created || []) {
      await prisma.item.create({
        data: {
          id: item.server_id || item.id,
          name: item.name,
          description: item.description || null,
          categoryId: item.category_id,
          condition: item.condition || 'GOOD',
          quantity: item.quantity || 1,
          lengthIn: item.length_in || null,
          widthIn: item.width_in || null,
          heightIn: item.height_in || null,
          weightLbs: item.weight_lbs || null,
          shapeType: item.shape_type || 'BOX',
          fate: item.fate || 'UNDECIDED',
          originLocationId: item.origin_location_id,
          destinationLocationId: item.destination_location_id || null,
          isContainer: item.is_container || false,
          notes: item.notes || null,
          addedById: userId,
          lastModifiedById: userId,
        },
      });
    }

    // Updated items
    for (const item of changes.items.updated || []) {
      const data: Record<string, unknown> = { lastModifiedById: userId };
      if (item.name !== undefined) data.name = item.name;
      if (item.description !== undefined) data.description = item.description;
      if (item.condition !== undefined) data.condition = item.condition;
      if (item.quantity !== undefined) data.quantity = item.quantity;
      if (item.fate !== undefined) data.fate = item.fate;
      if (item.notes !== undefined) data.notes = item.notes;
      if (item.estimated_sale_value !== undefined) data.estimatedSaleValue = item.estimated_sale_value;

      const id = item.server_id || item.id;
      await prisma.item.update({ where: { id }, data }).catch(() => {
        // Item may not exist on server yet — skip
      });
    }

    // Deleted items (soft delete)
    for (const id of changes.items.deleted || []) {
      await prisma.item.update({
        where: { id },
        data: { deletedAt: new Date(), lastModifiedById: userId },
      }).catch(() => {});
    }
  }

  res.json({ ok: true });
});

export default router;
