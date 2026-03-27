import { z } from 'zod';

export const createContainerSchema = z.object({
  // The Item data for the container itself
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  categoryId: z.string().uuid(),
  originLocationId: z.string().uuid(),
  destinationLocationId: z.string().uuid().nullable().optional(),
  fate: z.enum(['KEEP', 'SELL', 'DONATE', 'TRASH', 'UNDECIDED']).default('KEEP'),
  notes: z.string().max(5000).nullable().optional(),

  // Container-specific fields
  containerType: z.enum(['UBOX', 'TOTE_27GAL', 'BOX_SMALL', 'BOX_MEDIUM', 'BOX_LARGE', 'BOX_CUSTOM', 'CUSTOM']),
  label: z.string().min(1, 'Label is required').max(50),
  internalLengthIn: z.number().positive(),
  internalWidthIn: z.number().positive(),
  internalHeightIn: z.number().positive(),
  maxWeightLbs: z.number().positive().nullable().optional(),
});

export const updateContainerSchema = createContainerSchema.partial();
