/**
 * Shared PNG encoder internals: chunks, CRC-32, scanlines — no compression,
 * no Node APIs. Used by both the Node (zlib) and browser (CompressionStream)
 * PNG renderers.
 *
 * @packageDocumentation
 */

import { QUIET_ZONE } from '../../core/constants';
import type { QRCode, RenderOptions } from '../../core/types';

/** PNG signature. */
export const SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** CRC-32 lookup table (poly 0xEDB88320). */
const CRC_TABLE = ((): Uint32Array => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/**
 * Computes the CRC-32 checksum of `data`.
 *
 * @param data - Bytes to checksum
 * @returns CRC-32 value
 */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Parses a hex colour (`#RGB` or `#RRGGBB`) into an RGB triple.
 *
 * @param value - Colour string
 * @returns `[r, g, b]` (0-255)
 * @throws {RangeError} If the colour is not a supported hex value
 */
export function parseColor(value: string): [number, number, number] {
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value);
  if (!match) {
    throw new RangeError(`qrToPNG: color must be #RGB or #RRGGBB; got "${value}"`);
  }
  const hex = match[1]!;
  if (hex.length === 3) {
    return [
      parseInt(hex[0]! + hex[0]!, 16),
      parseInt(hex[1]! + hex[1]!, 16),
      parseInt(hex[2]! + hex[2]!, 16),
    ];
  }
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

function u32be(value: number): Uint8Array {
  return Uint8Array.from([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
}

/**
 * Builds a PNG chunk: length | type | data | crc32(type + data).
 *
 * @param type - Four-letter chunk type
 * @param data - Chunk payload
 * @returns Complete chunk bytes
 */
export function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = Uint8Array.from([...type].map((ch) => ch.charCodeAt(0)));
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes, 0);
  body.set(data, typeBytes.length);

  const out = new Uint8Array(4 + body.length + 4);
  out.set(u32be(data.length), 0);
  out.set(body, 4);
  out.set(u32be(crc32(body)), 4 + body.length);
  return out;
}

/**
 * Builds the raw indexed-colour scanlines plus the IHDR and PLTE chunks —
 * everything except the compressed IDAT chunk.
 *
 * @param qr - QR code
 * @param options - Render options
 * @returns Raw scanlines (filter byte 0 per row), IHDR, PLTE and the pixel
 *   dimension
 * @throws {RangeError} If `scale`/`margin`/colours are invalid
 */
export function buildPNGParts(
  qr: QRCode,
  options: RenderOptions,
): { raw: Uint8Array; ihdr: Uint8Array; plte: Uint8Array; dim: number } {
  const scale = options.scale ?? 4;
  const margin = options.margin ?? QUIET_ZONE;

  if (!Number.isInteger(scale) || scale < 0) {
    throw new RangeError(
      `qrToPNG: scale must be a non-negative integer; got ${String(scale)}`,
    );
  }
  if (!Number.isInteger(margin) || margin < 0) {
    throw new RangeError(
      `qrToPNG: margin must be a non-negative integer; got ${String(margin)}`,
    );
  }

  const darkRgb = parseColor(options.dark ?? '#000000');
  const lightRgb = parseColor(options.light ?? '#ffffff');

  const { modules, size } = qr;
  const dim = (size + margin * 2) * scale;

  const raw = new Uint8Array(dim * (dim + 1));
  for (let y = 0; y < dim; y++) {
    const rowStart = y * (dim + 1);
    raw[rowStart] = 0; // filter: None
    const moduleRow = Math.floor(y / scale) - margin;
    for (let x = 0; x < dim; x++) {
      const moduleCol = Math.floor(x / scale) - margin;
      const inside =
        moduleRow >= 0 && moduleRow < size && moduleCol >= 0 && moduleCol < size;
      const dark = inside && modules[moduleRow]![moduleCol]!;
      // Palette index: 0 = dark, 1 = light.
      raw[rowStart + 1 + x] = dark ? 0 : 1;
    }
  }

  const ihdr = new Uint8Array(13);
  ihdr.set(u32be(dim), 0);
  ihdr.set(u32be(dim), 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 3; // colour type: indexed
  ihdr[10] = 0; // compression: deflate
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace: none

  const plte = Uint8Array.from([...darkRgb, ...lightRgb]);

  return { raw, ihdr, plte, dim };
}

/**
 * Concatenates chunk byte arrays into one buffer.
 *
 * @param parts - Ordered chunk arrays
 * @returns Assembled bytes
 */
export function assemblePNG(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}
