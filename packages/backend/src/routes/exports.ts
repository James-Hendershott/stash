import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { generateManifestPdf, generateQRLabelsPdf, generateSellListPdf, generateDonateListPdf } from '../services/pdf';

const router = Router();

router.use(requireAuth);

// ── PDF Exports ──────────────────────────────────────────

/**
 * GET /api/export/pdf/manifest/:containerId
 * Generate and download a container manifest PDF.
 */
router.get('/pdf/manifest/:containerId', async (req: Request, res: Response) => {
  try {
    const containerId = req.params.containerId as string;
    const buffer = await generateManifestPdf(containerId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="manifest-${containerId}.pdf"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(err.message === 'Container not found' ? 404 : 500).json({ error: err.message });
  }
});

/**
 * GET /api/export/pdf/qr-labels
 * Generate QR label sheet PDF for all (or specific) containers.
 * Query: ?ids=id1,id2,id3 (optional — all containers if omitted)
 */
router.get('/pdf/qr-labels', async (req: Request, res: Response) => {
  try {
    const ids = req.query.ids ? (req.query.ids as string).split(',') : undefined;
    const buffer = await generateQRLabelsPdf(ids);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="qr-labels.pdf"');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/export/pdf/sell-list
 * Generate a PDF of all items marked as SELL.
 */
router.get('/pdf/sell-list', async (_req: Request, res: Response) => {
  try {
    const buffer = await generateSellListPdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sell-list.pdf"');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/export/pdf/donate-list
 * Generate a PDF of all items marked as DONATE.
 */
router.get('/pdf/donate-list', async (_req: Request, res: Response) => {
  try {
    const buffer = await generateDonateListPdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="donate-list.pdf"');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── CSV Exports ──────────────────────────────────────────

/**
 * GET /api/export/csv/items
 * Export all active items as CSV.
 * Query params: ?fate=SELL&categoryId=... (same filters as item list)
 */
router.get('/csv/items', async (req: Request, res: Response) => {
  const { fate, categoryId, locationId } = req.query;
  const where: Record<string, unknown> = { deletedAt: null };
  if (fate) where.fate = fate;
  if (categoryId) where.categoryId = categoryId;
  if (locationId) where.originLocationId = locationId;

  const items = await prisma.item.findMany({
    where,
    include: {
      category: { select: { name: true } },
      originLocation: { select: { name: true } },
      destinationLocation: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });

  const headers = [
    'Name', 'Description', 'Category', 'Condition', 'Quantity',
    'Fate', 'Origin Room', 'Destination Room',
    'Length (in)', 'Width (in)', 'Height (in)', 'Weight (lbs)',
    'Est. Sale Value', 'AI Price', 'Notes',
  ];

  const rows = items.map((item) => [
    csvEscape(item.name),
    csvEscape(item.description || ''),
    csvEscape(item.category.name),
    item.condition,
    item.quantity,
    item.fate,
    csvEscape(item.originLocation.name),
    csvEscape(item.destinationLocation?.name || ''),
    item.lengthIn || '',
    item.widthIn || '',
    item.heightIn || '',
    item.weightLbs || '',
    item.estimatedSaleValue || '',
    item.llmPriceSuggestion || '',
    csvEscape(item.notes || ''),
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="stash-items-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default router;
