/**
 * File output for Node.js (`node:fs/promises`).
 *
 * @packageDocumentation
 */

import { writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import type { QRCode, RenderOptions } from '../../core/types';
import { qrToASCII } from '../ascii';
import { qrToSVG } from '../svg';
import { qrToPNG } from '../png/node';

const SVG_EXTENSIONS = new Set(['.svg']);
const PNG_EXTENSIONS = new Set(['.png']);
const ASCII_EXTENSIONS = new Set(['.txt', '.ascii']);

/**
 * Renders a QR code to a file (Node.js only). The format is chosen by the
 * path extension:
 *
 * - `.svg` — SVG document
 * - `.png` — PNG image
 * - `.txt` / `.ascii` — ASCII art
 *
 * @param qr - QR code
 * @param path - Target file path (extension decides the format)
 * @param options - Render options (colors/scale/margin as the matching renderer)
 * @returns Resolves when the file is written
 *
 * @example
 * ```typescript
 * await qrToFile(generateQR('hello'), 'qr.svg');
 * await qrToFile(generateQR('hello'), 'qr.png');
 * ```
 * @throws {RangeError} If the extension is not supported
 * @throws {TypeError} If `path` is not a string
 */
export async function qrToFile(
  qr: QRCode,
  path: string,
  options: RenderOptions = {},
): Promise<void> {
  if (typeof path !== 'string') {
    throw new TypeError(`qrToFile: path must be a string; got ${typeof path}`);
  }
  const ext = extname(path).toLowerCase();
  let data: string | Buffer;
  if (SVG_EXTENSIONS.has(ext)) {
    data = qrToSVG(qr, options);
  } else if (PNG_EXTENSIONS.has(ext)) {
    data = qrToPNG(qr, options);
  } else if (ASCII_EXTENSIONS.has(ext)) {
    data = qrToASCII(qr);
  } else {
    throw new RangeError(
      `qrToFile: unsupported extension "${ext}" (expected .svg, .png, .txt or .ascii)`,
    );
  }
  await writeFile(path, data);
}
