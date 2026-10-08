// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import * as browserEntry from '../src/index.browser';

describe('browser entry (happy-dom)', () => {
  it('exports the full surface without Node APIs', async () => {
    expect(typeof browserEntry.generateQR).toBe('function');
    expect(typeof browserEntry.qrToTerminal).toBe('function');
    expect(typeof browserEntry.qrToASCII).toBe('function');
    expect(typeof browserEntry.qrToSVG).toBe('function');
    expect(typeof browserEntry.qrToPNG).toBe('function');
    expect(typeof browserEntry.qrToFile).toBe('function');

    const qr = browserEntry.generateQR('https://example.com');
    expect(qr.size).toBe(4 * qr.version + 17);
    expect(browserEntry.qrToSVG(qr)).toContain('<svg');
    expect(browserEntry.qrToASCII(qr)).toMatch(/^[01]+$/m);
  });

  it('qrToPNG is async and returns PNG bytes (CompressionStream from Node global)', async () => {
    const qr = browserEntry.generateQR('hello');
    const result = browserEntry.qrToPNG(qr);
    expect(result).toBeInstanceOf(Promise);
    const png = await result;
    expect(png).toBeInstanceOf(Uint8Array);
    expect(png.subarray(0, 4)).toEqual(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it('qrToFile stub throws with subpath + docs hints', async () => {
    const qr = browserEntry.generateQR('hello');
    await expect(browserEntry.qrToFile(qr, 'x.png')).rejects.toThrow(
      /@fab-orbita\/qr\/node/,
    );
    await expect(browserEntry.qrToFile(qr, 'x.png')).rejects.toThrow(
      /docs\/browser\.md/,
    );
  });

  it('works with DOM globals present (window/document)', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
    const qr = browserEntry.generateQR('dom');
    expect(qr.modules).toHaveLength(qr.size);
  });
});
