import { describe, expect, it } from 'vitest';
import { inflateSync } from 'node:zlib';
import { generateQR } from '../../../src/core/generate';
import { qrToPNG as qrToPNGNode } from '../../../src/render/png/node';
import { qrToPNG as qrToPNGBrowser } from '../../../src/render/png/browser';
import { crc32 } from '../../../src/render/png/shared';

interface ParsedChunk {
  type: string;
  data: Buffer;
  crc: number;
}

function parseChunks(png: Uint8Array): ParsedChunk[] {
  const buf = Buffer.from(png);
  const chunks: ParsedChunk[] = [];
  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    const crc = buf.readUInt32BE(offset + 8 + length);
    chunks.push({ type, data: Buffer.from(data), crc });
    offset += 12 + length;
  }
  return chunks;
}

function inflateIdat(png: Uint8Array): Buffer {
  const idat = parseChunks(png).find((c) => c.type === 'IDAT')!.data;
  return inflateSync(idat);
}

describe('qrToPNG (browser / CompressionStream)', () => {
  it('returns valid PNG bytes with correct signature and CRCs', async () => {
    const qr = generateQR('hello');
    const png = await qrToPNGBrowser(qr);
    expect(png).toBeInstanceOf(Uint8Array);
    expect(png.subarray(0, 8)).toEqual(
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    const chunks = parseChunks(png);
    expect(chunks.map((c) => c.type)).toEqual(['IHDR', 'PLTE', 'IDAT', 'IEND']);
    for (const chunk of chunks) {
      const body = Buffer.concat([Buffer.from(chunk.type, 'ascii'), chunk.data]);
      expect(crc32(body) >>> 0, `${chunk.type} crc`).toBe(chunk.crc);
    }
    expect(chunks.find((c) => c.type === 'IEND')!.crc).toBe(0xae426082);
  });

  it('inflates to exactly the same raw scanlines as the Node renderer', async () => {
    const qr = generateQR('https://example.com/тест', { ecLevel: 'Q' });
    const options = { scale: 3, margin: 2, dark: '#123456', light: '#fedcba' };

    const nodePng = qrToPNGNode(qr, options);
    const browserPng = await qrToPNGBrowser(qr, options);

    // Deflate bytes may differ between zlib and CompressionStream — the
    // decompressed pixel data must be identical.
    const rawNode = inflateIdat(nodePng);
    const rawBrowser = inflateIdat(browserPng);
    expect(rawBrowser.equals(rawNode)).toBe(true);

    // IHDR geometry matches too.
    const ihdr = (png: Uint8Array): Buffer =>
      parseChunks(png).find((c) => c.type === 'IHDR')!.data;
    expect(ihdr(browserPng).equals(ihdr(nodePng))).toBe(true);
    const plte = (png: Uint8Array): Buffer =>
      parseChunks(png).find((c) => c.type === 'PLTE')!.data;
    expect(plte(browserPng).equals(plte(nodePng))).toBe(true);
    expect([...plte(browserPng)]).toEqual([0x12, 0x34, 0x56, 0xfe, 0xdc, 0xba]);
  });

  it('produces decodable pixels for a full-size symbol', async () => {
    // Large enough to exercise the reader-first deflate path end to end.
    const qr = generateQR('x'.repeat(400), { ecLevel: 'H' });
    const png = await qrToPNGBrowser(qr, { scale: 2, margin: 4 });
    const raw = inflateIdat(png);
    const dim = (qr.size + 8) * 2;
    expect(raw).toHaveLength(dim * (dim + 1));
    // Finder corner module is dark (palette index 0).
    const px = (x: number, y: number): number => raw[y * (dim + 1) + 1 + x]!;
    expect(px(8, 8)).toBe(0);
    expect(px(0, 0)).toBe(1);
  }, 30_000);

  it('propagates validation errors from shared parts', async () => {
    const qr = generateQR('hello');
    await expect(qrToPNGBrowser(qr, { scale: -1 })).rejects.toThrow(RangeError);
    await expect(qrToPNGBrowser(qr, { dark: 'red' })).rejects.toThrow(RangeError);
  });
});
