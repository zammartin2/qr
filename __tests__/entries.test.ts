import { describe, expect, it } from 'vitest';
import * as universal from '../src/index';
import * as nodeEntry from '../src/index.node';

describe('universal entry (default condition)', () => {
  it('exports the full surface with async PNG and stub qrToFile', async () => {
    expect(typeof universal.generateQR).toBe('function');
    expect(typeof universal.qrToTerminal).toBe('function');
    expect(typeof universal.qrToASCII).toBe('function');
    expect(typeof universal.qrToSVG).toBe('function');
    expect(typeof universal.qrToPNG).toBe('function');
    expect(typeof universal.qrToFile).toBe('function');

    const qr = universal.generateQR('hello');
    expect(qr.version).toBe(1);

    // qrToPNG is the CompressionStream implementation — async everywhere here.
    const pngPromise = universal.qrToPNG(qr);
    expect(pngPromise).toBeInstanceOf(Promise);
    const png = await pngPromise;
    expect(png.subarray(0, 4)).toEqual(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]));

    // Renderers are sync strings.
    expect(universal.qrToASCII(qr).split('\n')).toHaveLength(qr.size);
    expect(universal.qrToSVG(qr)).toContain('<svg');
    expect(universal.qrToTerminal(qr, { small: true }).split('\n').length).toBe(
      Math.ceil(qr.size / 2),
    );
  });

  it('qrToFile stub throws with subpath + docs hints', async () => {
    const qr = universal.generateQR('hello');
    await expect(universal.qrToFile(qr, 'x.png')).rejects.toThrow(
      /@fab-orbita\/qr\/node/,
    );
    await expect(universal.qrToFile(qr, 'x.png')).rejects.toThrow(/docs\/browser\.md/);
  });
});

describe('node entry (node/deno/bun condition)', () => {
  it('provides the synchronous v1.0 contract', () => {
    expect(typeof nodeEntry.generateQR).toBe('function');
    const qr = nodeEntry.generateQR('hello');
    const png = nodeEntry.qrToPNG(qr);
    expect(Buffer.isBuffer(png)).toBe(true);
    expect(png.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    expect(typeof nodeEntry.qrToFile).toBe('function');
    expect(nodeEntry.qrToFile).not.toBe(universal.qrToFile);
  });

  it('exports the same renderers as the universal entry', () => {
    expect(nodeEntry.qrToSVG(nodeEntry.generateQR('x'))).toBe(
      universal.qrToSVG(universal.generateQR('x')),
    );
    expect(nodeEntry.qrToASCII(nodeEntry.generateQR('x'))).toBe(
      universal.qrToASCII(universal.generateQR('x')),
    );
  });

  it('re-exports all public types (compile-time contract smoke)', () => {
    // Runtime check that the type-only module graph resolves.
    const qr: import('../src/core/types').QRCode = nodeEntry.generateQR('x');
    const opts: import('../src/core/types').QROptions = { ecLevel: 'H' };
    expect(qr.ecLevel).toBe('M');
    expect(nodeEntry.generateQR('x', opts).ecLevel).toBe('H');
  });
});
