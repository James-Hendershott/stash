import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Multer storage configuration for item photos.
 * Files are saved to DATA_PATH/images/{itemId}/filename.
 */
const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = config.imagesPath;
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    // Prefix with timestamp to avoid collisions: 1711500000000-photo.jpg
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  },
});

/**
 * Filter: only allow image files (JPEG, PNG, WebP, HEIC).
 */
function imageFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  const allowed = /^image\/(jpeg|png|webp|heic|heif)$/;
  if (allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type "${file.mimetype}" not allowed. Use JPEG, PNG, WebP, or HEIC.`));
  }
}

/**
 * Upload middleware for a single item photo.
 * Max file size: 10 MB.
 */
export const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('photo');
