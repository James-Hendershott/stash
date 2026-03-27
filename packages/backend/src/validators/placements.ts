import { z } from 'zod';

export const createPlacementSchema = z.object({
  itemId: z.string().uuid(),
  containerId: z.string().uuid(),
  notes: z.string().max(500).nullable().optional(),
});

export const removePlacementSchema = z.object({
  removedAt: z.string().datetime().optional(), // Defaults to now
});
