/**
 * PNG renderer for Node.js — synchronous, `node:zlib`.
 *
 * @packageDocumentation
 */

import { Buffer } from 'node:buffer';
import { deflate } from '../../platform/deflate-node';
import type { QRCode, RenderOptions } from '../../core/types';
import { SIGNATURE, assemblePNG, buildPNGParts, chunk } from './shared';

/**
 * Renders a QR code as an 8-bit indexed-colour PNG buffer (Node.js only,
 * synchronous).
 *
 * Layout: PNG signature, IHDR, PLTE (dark then light), IDAT
 * (zlib-deflated scanlines with filter byte 0), IEND.
 *
 * @param qr - QR code
 * @param options - Render options
 * @param [options.scale=4] - Pixels per module
 * @param [options.margin=4] - Quiet zone in modules
 * @param [options.dark='#000000'] - Dark colour (`#RGB` or `#RRGGBB`)
 * @param [options.light='#ffffff'] - Light colour
 * @returns PNG file buffer
 *
 * @example
 * ```typescript
 * import { writeFileSync } from 'node:fs';
 * writeFileSync('qr.png', qrToPNG(generateQR('hello')));
 * ```
 * @throws {RangeError} If options are invalid or a colour is not hex
 */
export function qrToPNG(qr: QRCode, options: RenderOptions = {}): Buffer {
  const { raw, ihdr, plte } = buildPNGParts(qr, options);
  const idat = deflate(raw);
  const png = assemblePNG([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    chunk('IDAT', idat),
    chunk('IEND', new Uint8Array(0)),
  ]);
  return Buffer.from(png.buffer, png.byteOffset, png.byteLength);
}

export { crc32 } from './shared';
