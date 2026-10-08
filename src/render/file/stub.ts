/**
 * `qrToFile` stub for non-Node runtimes (browsers, Vercel Edge).
 *
 * Kept as a real export so that TypeScript types stay consistent across all
 * entry points — callers get a descriptive error instead of
 * "qrToFile is not a function".
 *
 * @packageDocumentation
 */

import type { QRCode, RenderOptions } from '../../core/types';

/**
 * Always throws: file output requires `node:fs`.
 *
 * @param _qr - QR code (unused)
 * @param _path - Target path (unused)
 * @param _options - Render options (unused)
 * @returns Never resolves
 * @throws {Error} Always
 */
export async function qrToFile(
  _qr: QRCode,
  _path: string,
  _options?: RenderOptions,
): Promise<never> {
  throw new Error(
    'qrToFile is only available in Node.js / Edge runtimes with node:fs. ' +
      'In Node.js, import from "@fab-orbita/qr/node": ' +
      'import { qrToFile } from "@fab-orbita/qr/node". ' +
      'In browsers, use qrToPNG/qrToSVG + Blob or data URL. ' +
      'See docs/browser.md.',
  );
}
