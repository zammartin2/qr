import { describe, expect, it } from 'vitest';
import { inflateSync } from 'node:zlib';
import { generateQR } from '../../src/index';
import { crc32, qrToPNG } from '../../src/render/png/node';
import { fixture3, fixture5 } from '../fixture';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

interface ParsedChunk {
  type: string;
  data: Buffer;
  crc: number;
}

/** Minimal PNG chunk walker used by the tests. */
function parseChunks(png: Buffer): ParsedChunk[] {
  const chunks: ParsedChunk[] = [];
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    const crc = png.readUInt32BE(offset + 8 + length);
    chunks.push({ type, data: Buffer.from(data), crc });
    offset += 12 + length;
  }
  return chunks;
}

describe('crc32', () => {
  it('matches the standard CRC-32 check value', () => {
    // The classic check input "123456789" -> 0xCBF43926.
    expect(crc32(Buffer.from('123456789')) >>> 0).toBe(0xcbf43926);
  });
});

describe('qrToPNG', () => {
  it('starts with the PNG signature', () => {
    const png = qrToPNG(generateQR('hello'));
    expect(png.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
  });

  it('emits well-formed chunks with valid CRCs', () => {
    const png = qrToPNG(generateQR('hello'));
    const chunks = parseChunks(png);
    expect(chunks.map((c) => c.type)).toEqual(['IHDR', 'PLTE', 'IDAT', 'IEND']);
    for (const chunk of chunks) {
      const body = Buffer.concat([
        Buffer.from(chunk.type, 'ascii'),
        chunk.data,
      ]);
      expect(crc32(body) >>> 0, `${chunk.type} crc`).toBe(chunk.crc);
    }
    // Independent anchor: the well-known CRC of the IEND chunk.
    const iend = chunks.find((c) => c.type === 'IEND')!;
    expect(iend.crc).toBe(0xae426082);
  });

  it('writes correct IHDR geometry and format fields', () => {
    const qr = generateQR('hello'); // size 21
    const png = qrToPNG(qr, { scale: 3, margin: 2 });
    const ihdr = parseChunks(png).find((c) => c.type === 'IHDR')!.data;
    const dim = (21 + 4) * 3; // (size + 2 * margin) * scale
    expect(ihdr.readUInt32BE(0)).toBe(dim);
    expect(ihdr.readUInt32BE(4)).toBe(dim);
    expect(ihdr[8]).toBe(8); // bit depth
    expect(ihdr[9]).toBe(3); // indexed colour
    expect(ihdr[10]).toBe(0); // deflate
    expect(ihdr[11]).toBe(0); // filter method
    expect(ihdr[12]).toBe(0); // no interlace
  });

  it('stores dark and light colors in PLTE', () => {
    const png = qrToPNG(fixture3(), { dark: '#123456', light: '#abcdef', scale: 1, margin: 0 });
    const plte = parseChunks(png).find((c) => c.type === 'PLTE')!.data;
    expect([...plte]).toEqual([0x12, 0x34, 0x56, 0xab, 0xcd, 0xef]);

    const short = qrToPNG(fixture3(), { dark: '#F00', light: '#FFF', scale: 1, margin: 0 });
    const plteShort = parseChunks(short).find((c) => c.type === 'PLTE')!.data;
    expect([...plteShort]).toEqual([0xff, 0, 0, 0xff, 0xff, 0xff]);
  });

  it('inflates to scanlines of filter 0 with correct pixels', () => {
    const qr = generateQR('hello');
    const scale = 4;
    const margin = 4;
    const dim = (qr.size + margin * 2) * scale;
    const png = qrToPNG(qr, { scale, margin });
    const idat = parseChunks(png).find((c) => c.type === 'IDAT')!.data;
    const raw = inflateSync(idat);

    expect(raw).toHaveLength(dim * (dim + 1));
    for (let y = 0; y < dim; y++) {
      expect(raw[y * (dim + 1)], `filter row ${y}`).toBe(0);
    }

    const pixel = (x: number, y: number): number => raw[y * (dim + 1) + 1 + x]!;
    // Quiet zone corner is light (palette index 1).
    expect(pixel(0, 0)).toBe(1);
    expect(pixel(dim - 1, dim - 1)).toBe(1);
    // Module (0, 0) of a QR code is always a dark finder corner (index 0).
    expect(pixel(margin * scale, margin * scale)).toBe(0);
    // Module (0, 7) is the light separator.
    expect(pixel(margin * scale + 7 * scale, margin * scale)).toBe(1);
    // Cell colour is uniform across the scaled block.
    expect(pixel(margin * scale + 1, margin * scale + 1)).toBe(0);
  });

  it('changes geometry with scale and margin', () => {
    const qr = fixture5();
    const a = parseChunks(qrToPNG(qr, { scale: 1, margin: 0 })).find(
      (c) => c.type === 'IHDR',
    )!.data;
    expect(a.readUInt32BE(0)).toBe(5);
    const b = parseChunks(qrToPNG(qr, { scale: 2, margin: 1 })).find(
      (c) => c.type === 'IHDR',
    )!.data;
    expect(b.readUInt32BE(0)).toBe((5 + 2) * 2);
  });

  it('is deterministic', () => {
    const qr = generateQR('determinism check');
    expect(qrToPNG(qr).equals(qrToPNG(qr))).toBe(true);
  });

  it('rejects invalid options and colors', () => {
    const qr = fixture3();
    expect(() => qrToPNG(qr, { scale: -1 })).toThrow(RangeError);
    expect(() => qrToPNG(qr, { scale: 2.5 })).toThrow(RangeError);
    expect(() => qrToPNG(qr, { margin: -1 })).toThrow(RangeError);
    expect(() => qrToPNG(qr, { margin: 1.5 })).toThrow(RangeError);
    expect(() => qrToPNG(qr, { dark: 'black' })).toThrow(RangeError);
    expect(() => qrToPNG(qr, { light: '#12' })).toThrow(RangeError);
    expect(() => qrToPNG(qr, { light: 'red' })).toThrow(/#RGB or #RRGGBB/);
  });
});
