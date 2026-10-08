import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateQR } from '../../../src/core/generate';
import { qrToFile } from '../../../src/render/file/node';

describe('qrToFile (Node.js)', () => {
  it('writes SVG, PNG and ASCII files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fab-qr-'));
    try {
      const qr = generateQR('https://example.com');

      await qrToFile(qr, join(dir, 'out.svg'), { scale: 8 });
      const svg = await readFile(join(dir, 'out.svg'), 'utf8');
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox=');

      await qrToFile(qr, join(dir, 'out.png'), { scale: 2 });
      const png = await readFile(join(dir, 'out.png'));
      expect(png.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));

      await qrToFile(qr, join(dir, 'out.txt'));
      const txt = await readFile(join(dir, 'out.txt'), 'utf8');
      expect(txt.split('\n')).toHaveLength(qr.size);

      await qrToFile(qr, join(dir, 'out.ascii'));
      const ascii = await readFile(join(dir, 'out.ascii'), 'utf8');
      expect(ascii).toBe(txt);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects unsupported extensions and non-string paths', async () => {
    const qr = generateQR('hello');
    await expect(qrToFile(qr, 'out.jpg')).rejects.toThrow(RangeError);
    await expect(qrToFile(qr, 'out')).rejects.toThrow(RangeError);
    await expect(qrToFile(qr, 123 as unknown as string)).rejects.toThrow(TypeError);
  });
});
