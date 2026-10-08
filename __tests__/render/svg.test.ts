import { describe, expect, it } from 'vitest';
import { generateQR } from '../../src/index';
import { qrToSVG } from '../../src/render/svg';
import { fixture3, fixture5 } from '../fixture';

describe('qrToSVG', () => {
  it('starts with the XML declaration and svg root', () => {
    const svg = qrToSVG(generateQR('hello'));
    expect(svg.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('computes viewBox with a default quiet zone of 4', () => {
    const qr = generateQR('hello'); // size 21
    const svg = qrToSVG(qr);
    expect(svg).toContain('viewBox="0 0 29 29"');
    expect(svg).toContain('width="29"');
    expect(svg).toContain('height="29"');
  });

  it('applies scale and margin', () => {
    const qr = generateQR('hello'); // size 21
    const svg = qrToSVG(qr, { scale: 10, margin: 2 });
    expect(svg).toContain('viewBox="0 0 25 25"');
    expect(svg).toContain('width="250"');
    expect(svg).toContain('height="250"');
    const svg0 = qrToSVG(qr, { margin: 0, scale: 1 });
    expect(svg0).toContain('viewBox="0 0 21 21"');
  });

  it('merges horizontal runs of dark modules into path segments', () => {
    // fixture3 rows 101/010/101 -> 2 + 1 + 2 = 5 runs.
    const svg = qrToSVG(fixture3(), { margin: 0 });
    const d = /<path d="([^"]*)"/.exec(svg)![1]!;
    expect(d.match(/M/g)).toHaveLength(5);
    // Row 0 starts with a single dark module at x=0, y=0.
    expect(d).toContain('M0 0h1v1h-1z');
    // Row 2 of fixture5: 11100 -> run of 3 starting at x=0, y=2.
    const svg5 = qrToSVG(fixture5(), { margin: 0 });
    const d5 = /<path d="([^"]*)"/.exec(svg5)![1]!;
    expect(d5).toContain('M0 2h3v1h-3z');
    // Last row is a full-width run of 5.
    expect(d5).toContain('M0 4h5v1h-5z');
  });

  it('respects the quiet zone: no dark runs inside the margin', () => {
    const qr = generateQR('hello');
    const svg = qrToSVG(qr, { margin: 4, scale: 1 });
    const d = /<path d="([^"]*)"/.exec(svg)![1]!;
    const coords = [...d.matchAll(/M(\d+) (\d+)/g)];
    expect(coords.length).toBeGreaterThan(0);
    for (const [, x, y] of coords) {
      expect(Number(x)).toBeGreaterThanOrEqual(4);
      expect(Number(y)).toBeGreaterThanOrEqual(4);
      expect(Number(x)).toBeLessThan(4 + qr.size);
      expect(Number(y)).toBeLessThan(4 + qr.size);
    }
  });

  it('applies custom colors', () => {
    const svg = qrToSVG(fixture3(), { dark: '#123456', light: '#abcdef' });
    expect(svg).toContain('fill="#123456"');
    expect(svg).toContain('fill="#abcdef"');
  });

  it('escapes hostile color strings (no attribute injection)', () => {
    const hostile = `'&"><script>alert('x')</script>`;
    const svg = qrToSVG(fixture3(), { dark: hostile, light: hostile });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&quot;&gt;&lt;script&gt;');
    expect(svg).toContain('&amp;');
    expect(svg).toContain('&apos;');
  });

  it('rejects invalid scale and margin', () => {
    expect(() => qrToSVG(fixture3(), { scale: -1 })).toThrow(RangeError);
    expect(() => qrToSVG(fixture3(), { scale: 1.5 })).toThrow(RangeError);
    expect(() => qrToSVG(fixture3(), { margin: -2 })).toThrow(RangeError);
    expect(() => qrToSVG(fixture3(), { margin: 0.5 })).toThrow(RangeError);
  });
});
