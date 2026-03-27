import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { requireAuth } from '../middleware/auth';
import { estimatePrice } from '../services/pricing';

const router = Router();

router.use(requireAuth);

/**
 * POST /api/items/:id/price-estimate
 * Ask Claude to estimate a selling price for this item.
 * Saves the result to the item record.
 */
router.post('/items/:id/price-estimate', async (req: Request, res: Response) => {
  if (!config.anthropicApiKey) {
    res.status(503).json({
      error: 'Price estimation unavailable — ANTHROPIC_API_KEY not configured',
    });
    return;
  }

  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item || item.deletedAt) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  try {
    const estimate = await estimatePrice(req.params.id);

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'PRICE_ESTIMATE',
        entityType: 'Item',
        entityId: req.params.id,
        newValue: {
          suggestedPrice: estimate.suggestedPrice,
          platforms: estimate.platforms,
        },
      },
    });

    res.json(estimate);
  } catch (err: any) {
    console.error('Price estimation failed:', err);
    res.status(500).json({ error: err.message || 'Price estimation failed' });
  }
});

/**
 * GET /api/items/:id/price-estimate
 * Get the stored price estimate for an item (if one exists).
 */
router.get('/items/:id/price-estimate', async (req: Request, res: Response) => {
  const item = await prisma.item.findUnique({
    where: { id: req.params.id },
    select: {
      llmPriceSuggestion: true,
      llmPriceRationale: true,
      llmPricePlatforms: true,
      llmPriceGeneratedAt: true,
    },
  });

  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  if (!item.llmPriceSuggestion) {
    res.json({ estimated: false });
    return;
  }

  res.json({
    estimated: true,
    suggestedPrice: item.llmPriceSuggestion,
    rationale: item.llmPriceRationale,
    platforms: item.llmPricePlatforms,
    generatedAt: item.llmPriceGeneratedAt,
  });
});

export default router;
