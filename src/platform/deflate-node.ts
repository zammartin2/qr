/**
 * Deflate compression for Node.js (synchronous, `node:zlib`).
 *
 * @packageDocumentation
 */

import { deflateSync } from 'node:zlib';

/**
 * Compresses `data` to a zlib (RFC 1950) stream — the PNG IDAT format.
 *
 * @param data - Bytes to compress
 * @returns Compressed bytes
 */
export function deflate(data: Uint8Array): Uint8Array {
  return new Uint8Array(deflateSync(data, { level: 9 }));
}
