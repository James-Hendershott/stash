import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  icon: z.string().min(1, 'Icon is required').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color like #FF0000'),
});

export const updateCategorySchema = createCategorySchema.partial();
