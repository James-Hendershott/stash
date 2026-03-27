import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { requireAuth } from '../middleware/auth';
import { uploadPhoto } from '../middleware/upload';
import { generateQRCode, generateQRCodeDataUrl } from '../services/qrcode';

const router = Router();

router.use(requireAuth);

/**
 * POST /api/items/:id/photo
 * Upload a photo for an item. Overwrites any existing photo.
 */
router.post('/items/:id/photo', (req: Request, res: Response, next: NextFunction) => {
  // Wrap multer to handle its errors gracefully
  uploadPhoto(req, res, async (err) => {
    if (err) {
      const status = err.message.includes('not allowed') ? 400 : 413;
      res.status(status).json({ error: err.message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No photo file provided. Send as form-data with field name "photo".' });
      return;
    }

    const item = await prisma.item.findUnique({ where: { id: req.params.id } });
    if (!item || item.deletedAt) {
      // Clean up the uploaded file since the item doesn't exist
      fs.unlinkSync(req.file.path);
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    // Delete previous photo if one exists
    if (item.photoPath) {
      const oldPath = path.join(config.dataPath, item.photoPath);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Store relative path in database
    const relativePath = `images/${req.file.filename}`;
    await prisma.item.update({
      where: { id: req.params.id },
      data: { photoPath: relativePath, lastModifiedById: req.user!.userId },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPLOAD_PHOTO',
        entityType: 'Item',
        entityId: req.params.id,
        newValue: { photoPath: relativePath },
      },
    });

    res.json({
      photoPath: relativePath,
      url: `/api/files/${relativePath}`,
    });
  });
});

/**
 * DELETE /api/items/:id/photo
 * Remove the photo from an item.
 */
router.delete('/items/:id/photo', async (req: Request, res: Response) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item || item.deletedAt) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  if (!item.photoPath) {
    res.status(404).json({ error: 'Item has no photo' });
    return;
  }

  // Delete the file
  const filePath = path.join(config.dataPath, item.photoPath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await prisma.item.update({
    where: { id: req.params.id },
    data: { photoPath: null, lastModifiedById: req.user!.userId },
  });

  res.status(204).send();
});

/**
 * POST /api/items/:id/qrcode
 * Generate a QR code for an item. Saves to disk and stores path.
 */
router.post('/items/:id/qrcode', async (req: Request, res: Response) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item || item.deletedAt) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  const qrCodePath = await generateQRCode('item', item.id);
  await prisma.item.update({
    where: { id: item.id },
    data: { qrCodePath },
  });

  res.json({
    qrCodePath,
    url: `/api/files/${qrCodePath}`,
  });
});

/**
 * GET /api/items/:id/qrcode
 * Get the QR code for an item as a data URL (base64 PNG).
 * Generates on the fly — does not require generating to disk first.
 */
router.get('/items/:id/qrcode', async (req: Request, res: Response) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item || item.deletedAt) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  const dataUrl = await generateQRCodeDataUrl('item', item.id);
  res.json({ dataUrl });
});

/**
 * POST /api/containers/:id/qrcode
 * Generate a QR code for a container.
 */
router.post('/containers/:id/qrcode', async (req: Request, res: Response) => {
  const container = await prisma.container.findUnique({ where: { id: req.params.id } });
  if (!container) {
    res.status(404).json({ error: 'Container not found' });
    return;
  }

  const qrCodePath = await generateQRCode('container', container.id);
  await prisma.container.update({
    where: { id: container.id },
    data: { qrCodePath },
  });

  res.json({
    qrCodePath,
    url: `/api/files/${qrCodePath}`,
  });
});

/**
 * GET /api/containers/:id/qrcode
 * Get a container's QR code as a data URL.
 */
router.get('/containers/:id/qrcode', async (req: Request, res: Response) => {
  const container = await prisma.container.findUnique({ where: { id: req.params.id } });
  if (!container) {
    res.status(404).json({ error: 'Container not found' });
    return;
  }

  const dataUrl = await generateQRCodeDataUrl('container', container.id);
  res.json({ dataUrl });
});

export default router;
