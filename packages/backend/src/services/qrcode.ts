import QRCode from 'qrcode';
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
 * Generate a QR code PNG for an item or container.
 *
 * The QR code encodes a URL like:
 *   https://stash.local/items/abc-123
 *   https://stash.local/containers/xyz-456
 *
 * On the mobile app, scanning this QR code will deep-link to the item detail
 * screen. On any browser, it will open the admin dashboard to that item.
 *
 * Returns the relative file path (from DATA_PATH) for storing in the database.
 */
export async function generateQRCode(
  entityType: 'item' | 'container',
  entityId: string,
): Promise<string> {
  ensureDir(config.qrCodesPath);

  // The URL the QR code will encode
  const url = `${config.backendUrl}/api/${entityType}s/${entityId}`;

  // File path: qrcodes/item-abc123.png
  const filename = `${entityType}-${entityId}.png`;
  const filePath = path.join(config.qrCodesPath, filename);

  await QRCode.toFile(filePath, url, {
    type: 'png',
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });

  // Return the path relative to DATA_PATH for database storage
  return `qrcodes/${filename}`;
}

/**
 * Generate a QR code as a Data URL (base64-encoded PNG).
 * Useful for returning the QR directly in an API response
 * without writing to disk.
 */
export async function generateQRCodeDataUrl(
  entityType: 'item' | 'container',
  entityId: string,
): Promise<string> {
  const url = `${config.backendUrl}/api/${entityType}s/${entityId}`;

  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
}

/**
 * Delete a QR code file if it exists.
 */
export function deleteQRCode(relativePath: string): void {
  const filePath = path.join(config.dataPath, relativePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
