import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { parseCsv, importCsvRows, IMPORTABLE_FIELDS, ColumnMapping } from '../services/csv-import';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAuth);

/**
 * POST /api/import/csv/parse
 * Upload a CSV file and get back headers + preview rows for column mapping.
 * Does NOT create any items — just parses and returns the data.
 */
router.post('/csv/parse', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No CSV file provided. Send as form-data with field name "file".' });
    return;
  }

  const text = req.file.buffer.toString('utf-8');
  const { headers, rows, rowCount } = parseCsv(text);

  // Return first 5 rows as preview
  res.json({
    headers,
    previewRows: rows.slice(0, 5),
    totalRows: rowCount,
    importableFields: IMPORTABLE_FIELDS,
  });
});

/**
 * POST /api/import/csv/execute
 * Execute the import using the full CSV data + column mapping.
 * Body: { csvText: string, mapping: { [colIndex]: fieldKey } }
 */
router.post('/csv/execute', async (req: Request, res: Response) => {
  const { csvText, mapping } = req.body as { csvText: string; mapping: ColumnMapping };

  if (!csvText || !mapping) {
    res.status(400).json({ error: 'csvText and mapping are required' });
    return;
  }

  // Verify name column is mapped
  const hasName = Object.values(mapping).includes('name');
  if (!hasName) {
    res.status(400).json({ error: 'You must map at least one column to "Name"' });
    return;
  }

  const { rows } = parseCsv(csvText);
  const result = await importCsvRows(rows, mapping, req.user!.userId);

  res.json(result);
});

export default router;
