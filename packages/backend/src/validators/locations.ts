import { z } from 'zod';

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['ORIGIN', 'DESTINATION']),
  house: z.string().min(1, 'House is required').max(100),
  floor: z.string().min(1, 'Floor is required').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color like #FF0000').default('#6B7280'),
  floorPlanX: z.number().nullable().optional(),
  floorPlanY: z.number().nullable().optional(),
  floorPlanWidth: z.number().positive().nullable().optional(),
  floorPlanHeight: z.number().positive().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

export const updateLocationSchema = createLocationSchema.partial();
