import { z } from 'zod';

export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  categoryId: z.string().uuid(),
  condition: z.enum(['GOOD', 'FAIR', 'POOR']).default('GOOD'),
  quantity: z.number().int().positive().default(1),
  lengthIn: z.number().positive().nullable().optional(),
  widthIn: z.number().positive().nullable().optional(),
  heightIn: z.number().positive().nullable().optional(),
  weightLbs: z.number().positive().nullable().optional(),
  shapeType: z.enum(['BOX', 'CYLINDER', 'SPHERE', 'L_SHAPE', 'PANEL']).default('BOX'),
  fate: z.enum(['KEEP', 'SELL', 'DONATE', 'TRASH', 'UNDECIDED']).default('UNDECIDED'),
  originLocationId: z.string().uuid(),
  destinationLocationId: z.string().uuid().nullable().optional(),
  isContainer: z.boolean().default(false),
  estimatedSaleValue: z.number().positive().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const updateItemSchema = createItemSchema.partial();

export const updateItemFateSchema = z.object({
  fate: z.enum(['KEEP', 'SELL', 'DONATE', 'TRASH', 'UNDECIDED']),
  estimatedSaleValue: z.number().positive().nullable().optional(),
});
