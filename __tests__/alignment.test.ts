import { describe, expect, it } from 'vitest';
import { getRowColCoords } from 'qrcode/lib/core/alignment-pattern.js';
import {
  getAlignmentCenters,
  getAlignmentPatterns,
  placeAlignmentPatterns,
} from '../src/core/alignment';

describe('getAlignmentPatterns', () => {
  it('returns [] for version 1', () => {
    expect(getAlignmentPatterns(1)).toEqual([]);
  });

  it('matches the qrcode reference for all versions 1-40', () => {
    for (let v = 1; v <= 40; v++) {
      expect(getAlignmentPatterns(v), `v${v}`).toEqual(getRowColCoords(v));
    }
  });

  it('has known coordinates for specific versions', () => {
    expect(getAlignmentPatterns(2)).toEqual([6, 18]);
    expect(getAlignmentPatterns(7)).toEqual([6, 22, 38]);
    expect(getAlignmentPatterns(32)).toEqual([6, 34, 60, 86, 112, 138]);
    expect(getAlignmentPatterns(40)).toEqual([6, 30, 58, 86, 114, 142, 170]);
  });

  it('always starts at 6 and ends at size - 7', () => {
    for (let v = 2; v <= 40; v++) {
      const coords = getAlignmentPatterns(v);
      const size = v * 4 + 17;
      expect(coords[0]).toBe(6);
      expect(coords[coords.length - 1]).toBe(size - 7);
    }
  });

  it('rejects invalid versions', () => {
    expect(() => getAlignmentPatterns(0)).toThrow(RangeError);
    expect(() => getAlignmentPatterns(41)).toThrow(RangeError);
    expect(() => getAlignmentPatterns(3.5)).toThrow(RangeError);
  });
});

describe('getAlignmentCenters', () => {
  it('returns [] for version 1', () => {
    expect(getAlignmentCenters(1)).toEqual([]);
  });

  it('keeps the single (18,18) center for version 2', () => {
    expect(getAlignmentCenters(2)).toEqual([[18, 18]]);
  });

  it('skips the three finder corners for version 7', () => {
    expect(getAlignmentCenters(7)).toEqual([
      [6, 22],
      [22, 6],
      [22, 22],
      [22, 38],
      [38, 22],
      [38, 38],
    ]);
  });

  it('never overlaps finder pattern corners for any version', () => {
    for (let v = 2; v <= 40; v++) {
      const coords = getAlignmentPatterns(v);
      const first = coords[0]!;
      const last = coords[coords.length - 1]!;
      for (const [r, c] of getAlignmentCenters(v)) {
        const isFinderCorner =
          (r === first && c === first) ||
          (r === first && c === last) ||
          (r === last && c === first);
        expect(isFinderCorner, `v${v} (${r},${c})`).toBe(false);
      }
    }
  });

  it('count is n^2 minus 3 finder corners', () => {
    for (let v = 2; v <= 40; v++) {
      const n = getAlignmentPatterns(v).length;
      expect(getAlignmentCenters(v)).toHaveLength(n * n - 3);
    }
  });
});

describe('placeAlignmentPatterns', () => {
  function blank(size: number): [number[][], boolean[][]] {
    return [
      Array.from({ length: size }, () => new Array<number>(size).fill(0)),
      Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
    ];
  }

  it('draws a 5x5 pattern and reserves it (version 2)', () => {
    const size = 25;
    const [matrix, reserved] = blank(size);
    placeAlignmentPatterns(matrix, 2, reserved);

    // Center (18,18): ring dark, inner ring light, center dark.
    expect(matrix[18]![18]).toBe(1);
    expect(matrix[16]![16]).toBe(1); // corner of 5x5
    expect(matrix[16]![18]).toBe(1);
    expect(matrix[17]![17]).toBe(0); // inner light ring
    expect(matrix[17]![18]).toBe(0);
    // Everything within the 5x5 box is reserved.
    for (let r = 16; r <= 20; r++) {
      for (let c = 16; c <= 20; c++) {
        expect(reserved[r]![c], `reserved ${r},${c}`).toBe(true);
      }
    }
    // Outside untouched.
    expect(reserved[0]![0]).toBe(false);
    expect(reserved[10]![10]).toBe(false);
  });

  it('is a no-op for version 1', () => {
    const [matrix, reserved] = blank(21);
    placeAlignmentPatterns(matrix, 1, reserved);
    expect(reserved.flat().every((cell) => cell === false)).toBe(true);
    expect(matrix.flat().every((cell) => cell === 0)).toBe(true);
  });

  it('draws all centers for version 7 (6 patterns)', () => {
    const size = 45;
    const [matrix, reserved] = blank(size);
    placeAlignmentPatterns(matrix, 7, reserved);
    for (const [r, c] of getAlignmentCenters(7)) {
      expect(matrix[r]![c], `center ${r},${c}`).toBe(1);
      expect(reserved[r]![c]).toBe(true);
    }
    // Exactly 6 * 25 reserved cells from alignment (may overlap timing, but
    // timing column/row are inside patterns only at crossings).
    const count = reserved.flat().filter(Boolean).length;
    expect(count).toBeGreaterThanOrEqual(6 * 25 - 10);
  });

  it('rejects invalid versions', () => {
    const [matrix, reserved] = blank(21);
    expect(() => placeAlignmentPatterns(matrix, 0, reserved)).toThrow(RangeError);
    expect(() => placeAlignmentPatterns(matrix, 41, reserved)).toThrow(RangeError);
  });
});
