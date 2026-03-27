import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createCategorySchema, updateCategorySchema } from '../validators/categories';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/categories
 * List all categories with item counts.
 */
router.get('/', async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { items: { where: { deletedAt: null } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  res.json(categories);
});

/**
 * GET /api/categories/:id
 * Get a single category.
 */
router.get('/:id', async (req: Request, res: Response) => {
  const category = await prisma.category.findUnique({
    where: { id: req.params.id },
    include: {
      _count: {
        select: { items: { where: { deletedAt: null } } },
      },
    },
  });

  if (!category) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  res.json(category);
});

/**
 * POST /api/categories
 * Create a new category.
 */
router.post('/', validate(createCategorySchema), async (req: Request, res: Response) => {
  const category = await prisma.category.create({ data: req.body });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      action: 'CREATE',
      entityType: 'Category',
      entityId: category.id,
      newValue: { name: category.name },
    },
  });

  res.status(201).json(category);
});

/**
 * PATCH /api/categories/:id
 * Update a category.
 */
router.patch('/:id', validate(updateCategorySchema), async (req: Request, res: Response) => {
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.json(category);
});

/**
 * DELETE /api/categories/:id
 * Delete a category (only if no items reference it).
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const itemCount = await prisma.item.count({
    where: { categoryId: req.params.id, deletedAt: null },
  });

  if (itemCount > 0) {
    res.status(409).json({
      error: `Cannot delete category — ${itemCount} item(s) still reference it`,
    });
    return;
  }

  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
