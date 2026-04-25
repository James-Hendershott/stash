/**
 * /api/books/* — book-specific endpoints.
 *
 *   POST   /api/books/lookup       — { isbn } OR { title, author }; returns
 *                                    metadata only (no DB write). Useful for
 *                                    "I have the ISBN typed in already."
 *
 *   POST   /api/books/import-csv   — multipart upload of a CSV produced by
 *                                    scripts/enrich-books.mjs (optionally with
 *                                    user-added room/container/fate columns).
 *                                    Batch-creates Item + BookDetails rows
 *                                    and ItemPlacement rows where applicable.
 *
 *   PATCH  /api/books/:itemId      — update an existing item's BookDetails
 *                                    (creates the row if it doesn't exist).
 *                                    Used by the manual-edit screen.
 *
 * Note: there is no in-app camera-to-AI endpoint. Bulk book ingest is done
 * offline (Claude.ai / ChatGPT chat UI for vision, then the enrichment
 * script, then this CSV import). See GUIDE.md "Bulk Cataloging Books".
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { uploadPhoto } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { lookupSchema, updateBookDetailsSchema } from '../validators/books';
import { lookupByISBN, lookupByTitleAuthor } from '../services/book-lookup';
import { resolveOrCreateContainer } from '../services/csv-import';
import { BookBinding } from '@stash/shared';
import fs from 'fs';

const router = Router();

router.use(requireAuth);

// ── POST /api/books/lookup ──────────────────────────────────────────
router.post('/lookup', validate(lookupSchema), async (req: Request, res: Response) => {
  const { isbn, title, author } = req.body as { isbn?: string; title?: string; author?: string };

  const result = isbn
    ? await lookupByISBN(isbn)
    : await lookupByTitleAuthor({ title: title!, authors: [author!] });

  if (!result) {
    res.status(404).json({ error: 'No match found in OpenLibrary or Google Books' });
    return;
  }

  res.json(result);
});

// ── POST /api/books/import-csv ──────────────────────────────────────
//
// CSV format (one header row required):
//
//   Required:
//     title
//     authors                — semicolon-separated, e.g. "King, Stephen; Straub, Peter"
//
//   Optional book metadata (filled in by scripts/enrich-books.mjs):
//     isbn10, isbn13, publisher, publishedYear, edition, pageCount,
//     language, binding, coverImageUrl, openLibraryId, googleBooksId,
//     lookupSource, lookupConfidence
//
//   Optional placement (you fill these in by hand, by shelf or by box):
//     originLocation         — must match a Location.name
//     destinationLocation    — must match a Location.name
//     fate                   — KEEP | SELL | DONATE | TRASH | UNDECIDED
//     containerLabel         — must match a Container.label; if present we
//                              also create an ItemPlacement
//     condition              — GOOD | FAIR | POOR (default GOOD)
//     quantity               — default 1
//     notes
//
// Multipart field name: "file"
router.post('/import-csv', uploadPhoto, async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'CSV file required (multipart field "file" or "photo")' });
    return;
  }

  const text = await fs.promises.readFile(req.file.path, 'utf8');
  // Tidy up the temp file regardless of outcome.
  fs.promises.unlink(req.file.path).catch(() => undefined);

  const rows = parseCsv(text);
  if (rows.length === 0) {
    res.status(400).json({ error: 'CSV is empty or has no data rows' });
    return;
  }

  // Pre-load reference data so name → ID resolution doesn't N+1 the DB.
  const [locations, booksCategory] = await Promise.all([
    prisma.location.findMany(),
    prisma.category.findUnique({ where: { name: 'Books & Media' } }),
  ]);

  const categoryId =
    booksCategory?.id ??
    (await prisma.category.create({
      data: { name: 'Books & Media', icon: 'book-open', color: '#10B981' },
    })).id;

  const locByName = new Map<string, string>(locations.map((l): [string, string] => [l.name.toLowerCase(), l.id]));
  const defaultOrigin = locations.find((l) => l.type === 'ORIGIN')?.id;

  // Cache resolved/auto-created containers so multiple books in the same
  // box only do one lookup.
  const containerCache = new Map<string, string>();

  const userId = req.user!.userId;
  const results = {
    created: 0,
    placed: 0,
    containersCreated: 0,
    errors: [] as Array<{ row: number; message: string }>,
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const title = String(row.title ?? '').trim();
      if (!title) throw new Error('Missing title');

      const originId = resolveLocationId(row.originLocation, locByName) ?? defaultOrigin;
      if (!originId) throw new Error('No originLocation column and no ORIGIN locations seeded');

      const destinationId = resolveLocationId(row.destinationLocation, locByName);

      // Resolve (or auto-create) the container by label or legacy hint.
      let containerId: string | undefined;
      if (row.containerLabel) {
        const labelKey = String(row.containerLabel).trim();
        const cached = containerCache.get(labelKey.toLowerCase());
        if (cached) {
          containerId = cached;
        } else {
          const resolved = await resolveOrCreateContainer(labelKey, originId, categoryId, userId);
          containerId = resolved.id;
          if (resolved.created) results.containersCreated++;
          containerCache.set(labelKey.toLowerCase(), resolved.id);
        }
      }

      await prisma.$transaction(async (tx) => {
        const item = await tx.item.create({
          data: {
            name: title,
            description: row.authors ? String(row.authors) : null,
            categoryId,
            condition: parseCondition(row.condition),
            quantity: parseQuantity(row.quantity),
            fate: parseFate(row.fate),
            originLocationId: originId,
            destinationLocationId: destinationId,
            notes: row.notes ? String(row.notes) : null,
            addedById: userId,
            lastModifiedById: userId,
          },
        });

        await tx.bookDetails.create({
          data: {
            itemId: item.id,
            title,
            authors: parseAuthors(row.authors),
            isbn10: row.isbn10 ? String(row.isbn10) : null,
            isbn13: row.isbn13 ? String(row.isbn13) : null,
            publisher: row.publisher ? String(row.publisher) : null,
            publishedYear: parseIntOrNull(row.publishedYear),
            edition: row.edition ? String(row.edition) : null,
            pageCount: parseIntOrNull(row.pageCount),
            language: row.language ? String(row.language) : null,
            binding: parseBinding(row.binding),
            coverImageUrl: row.coverImageUrl ? String(row.coverImageUrl) : null,
            openLibraryId: row.openLibraryId ? String(row.openLibraryId) : null,
            googleBooksId: row.googleBooksId ? String(row.googleBooksId) : null,
            lookupSource: row.lookupSource ? String(row.lookupSource) : 'csv-import',
            lookupConfidence: parseFloatOrNull(row.lookupConfidence),
          },
        });

        if (containerId) {
          await tx.itemPlacement.create({
            data: { itemId: item.id, containerId, placedById: userId },
          });
          results.placed++;
        }
      });

      results.created++;
    } catch (err) {
      results.errors.push({ row: i + 2, message: (err as Error).message });
    }
  }

  await prisma.activityLog.create({
    data: {
      userId,
      action: 'IMPORT',
      entityType: 'Book',
      entityId: 'batch',
      newValue: { created: results.created, placed: results.placed, failed: results.errors.length },
    },
  });

  res.json(results);
});

// ── PATCH /api/books/:itemId ────────────────────────────────────────
router.patch('/:itemId', validate(updateBookDetailsSchema), async (req: Request, res: Response) => {
  const itemId = req.params.itemId as string;
  const updates = req.body;

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item || item.deletedAt) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  const existing = await prisma.bookDetails.findUnique({ where: { itemId } });

  const bookDetails = existing
    ? await prisma.bookDetails.update({ where: { itemId }, data: updates })
    : await prisma.bookDetails.create({
        data: {
          itemId,
          title: updates.title ?? item.name,
          authors: updates.authors ?? [],
          ...updates,
          lookupSource: 'manual',
        },
      });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      action: 'UPDATE',
      entityType: 'BookDetails',
      entityId: bookDetails.id,
      newValue: updates,
    },
  });

  res.json(bookDetails);
});

// ── helpers ─────────────────────────────────────────────────────────

function resolveLocationId(name: unknown, map: Map<string, string>): string | undefined {
  if (typeof name !== 'string') return undefined;
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return undefined;
  return map.get(trimmed);
}

function parseAuthors(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== 'string') return [];
  return raw
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseFate(raw: unknown) {
  const upper = String(raw ?? '').toUpperCase();
  if (['KEEP', 'SELL', 'DONATE', 'TRASH', 'UNDECIDED'].includes(upper)) {
    return upper as 'KEEP' | 'SELL' | 'DONATE' | 'TRASH' | 'UNDECIDED';
  }
  return 'UNDECIDED';
}

function parseCondition(raw: unknown) {
  const upper = String(raw ?? '').toUpperCase();
  if (['GOOD', 'FAIR', 'POOR'].includes(upper)) {
    return upper as 'GOOD' | 'FAIR' | 'POOR';
  }
  return 'GOOD';
}

function parseBinding(raw: unknown) {
  if (typeof raw !== 'string') return BookBinding.UNKNOWN;
  const upper = raw.toUpperCase();
  if (upper in BookBinding) return BookBinding[upper as keyof typeof BookBinding];
  return BookBinding.UNKNOWN;
}

function parseQuantity(raw: unknown): number {
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parseIntOrNull(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : null;
}

function parseFloatOrNull(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseFloat(String(raw));
  return Number.isFinite(n) ? n : null;
}

// Minimal CSV parser — same approach as services/csv-import.ts. Supports
// quoted fields, escaped quotes, CRLF or LF line endings.
function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? '';
    });
    return row;
  });
}

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === ',') {
        out.push(cur);
        cur = '';
      } else if (c === '"' && cur === '') {
        inQuotes = true;
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}

export default router;
