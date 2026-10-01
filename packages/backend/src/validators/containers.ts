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
  containerType: z.enum(['UBOX', 'TOTE_35GAL', 'TOTE_27GAL', 'TOTE_14GAL', 'BOX_SMALL', 'BOX_MEDIUM', 'BOX_LARGE', 'BOX_CUSTOM', 'CUSTOM']),
  // Optional preferred label hint. The backend auto-generates a unique
  // code (T27-0012 etc.) but if you pass "Tote #12" or "12" we'll try to
  // reserve that sequence number for the chosen type.
  label: z.string().max(50).optional(),
  internalLengthIn: z.number().positive(),
  internalWidthIn: z.number().positive(),
  internalHeightIn: z.number().positive(),
  maxWeightLbs: z.number().positive().nullable().optional(),
});

export const updateContainerSchema = createContainerSchema.partial();

// v2: put a container at a storage spot (null clears it).
export const setContainerLocationSchema = z.object({
  locationId: z.string().uuid().nullable(),
});

// v2: mark a tote's label printed (or not yet → reminders).
export const setLabelStatusSchema = z.object({
  labelStatus: z.enum(['NOT_PRINTED', 'PRINTED']),
});
