/**
 * Deflate compression via the standard `CompressionStream` API
 * (browsers, Cloudflare Workers, Deno, Node.js 18+ as async fallback).
 *
 * @packageDocumentation
 */

import { hasCompressionStream } from './detect';

/**
 * Compresses `data` to a zlib (RFC 1950) stream — the PNG IDAT format —
 * using `CompressionStream('deflate')`.
 *
 * The readable side is attached **before** any write: awaiting `write()`
 * without a reader deadlocks on payloads larger than the stream's internal
 * queue (our raw scanlines reach ~548 KB for version 40 at scale 4).
 *
 * @param data - Bytes to compress
 * @returns Compressed bytes
 * @throws {Error} If `CompressionStream` is not available in this runtime
 *   (e.g. Vercel Edge Functions provide neither `CompressionStream` nor
 *   `node:zlib`)
 */
export async function deflate(data: Uint8Array): Promise<Uint8Array> {
  if (!hasCompressionStream()) {
    throw new Error(
      'qrToPNG: CompressionStream is not available in this runtime. ' +
        'Requirements: Node.js 18+, Chrome 80+, Firefox 113+, Safari 16.4+, ' +
        'Deno 1.19+, Cloudflare Workers. ' +
        'Vercel Edge Functions provide neither CompressionStream nor node:zlib, ' +
        'so PNG is not available there. ' +
        'Use @fab-orbita/qr/node (Node.js), qrToSVG (works everywhere), ' +
        'or upgrade your runtime. See docs/browser.md for details.',
    );
  }

  const stream = new CompressionStream('deflate');
  // Attach the reader first (see the doc comment) — arrayBuffer() starts the pump.
  const output = new Response(stream.readable).arrayBuffer();
  const writer = stream.writable.getWriter();
  await writer.write(data);
  await writer.close();
  return new Uint8Array(await output);
}
