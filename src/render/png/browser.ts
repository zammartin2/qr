/**
 * PNG renderer for browsers and edge runtimes — asynchronous,
 * `CompressionStream('deflate')`.
 *
 * @packageDocumentation
 */

import { deflate } from '../../platform/deflate-browser';
import type { QRCode, RenderOptions } from '../../core/types';
import { SIGNATURE, assemblePNG, buildPNGParts, chunk } from './shared';

/**
 * Renders a QR code to PNG bytes (async).
 *
 * Uses `CompressionStream('deflate')` — available in all modern browsers,
 * Cloudflare Workers, Deno Deploy, Node.js 18+ (but not Vercel Edge
 * Functions, where it throws a descriptive error).
 *
 * @param qr - QR code
 * @param options - Render options (same as the Node renderer)
 * @returns PNG bytes — use with `new Blob([bytes], { type: 'image/png' })`
 * @throws {RangeError} If options are invalid
 * @throws {Error} If `CompressionStream` is unavailable in this runtime
 *   (see docs/browser.md)
 */
export async function qrToPNG(
  qr: QRCode,
  options: RenderOptions = {},
): Promise<Uint8Array> {
  const { raw, ihdr, plte } = buildPNGParts(qr, options);
  const idat = await deflate(raw);
  return assemblePNG([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    chunk('IDAT', idat),
    chunk('IEND', new Uint8Array(0)),
  ]);
}
