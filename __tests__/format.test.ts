import { describe, expect, it } from 'vitest';
import { getEncodedBits as refFormatBits } from 'qrcode/lib/core/format-info.js';
import ECLevelRef from 'qrcode/lib/core/error-correction-level.js';
import { generateFormatInfo, placeFormatInfo } from '../src/core/format';
import type { ECLevel, MaskPattern } from '../src/core/types';

const LEVELS: ECLevel[] = ['L', 'M', 'Q', 'H'];

const REF_LEVEL = {
  L: ECLevelRef.L,
  M: ECLevelRef.M,
  Q: ECLevelRef.Q,
  H: ECLevelRef.H,
} as const;

function bits15(value: number): string {
  return value.toString(2).padStart(15, '0');
}

describe('generateFormatInfo', () => {
  it('matches the qrcode reference for all 32 EC/mask combinations', () => {
    for (const level of LEVELS) {
      for (let mask = 0 as MaskPattern; mask <= 7; mask++) {
        expect(generateFormatInfo(level, mask), `${level}/${mask}`).toBe(
          refFormatBits(REF_LEVEL[level], mask),
        );
      }
    }
  });

  it('matches known ISO anchors', () => {
    expect(bits15(generateFormatInfo('L', 0))).toBe('111011111000100');
    expect(bits15(generateFormatInfo('M', 0))).toBe('101010000010010');
    expect(bits15(generateFormatInfo('L', 1))).toBe('111001011110011');
    expect(bits15(generateFormatInfo('M', 5))).toBe('100000011001110');
    expect(bits15(generateFormatInfo('H', 7))).toBe('000100000111011');
  });

  it('never produces all-zero or all-one words', () => {
    for (const level of LEVELS) {
      for (let mask = 0 as MaskPattern; mask <= 7; mask++) {
        const bits = generateFormatInfo(level, mask);
        expect(bits).not.toBe(0);
        expect(bits).not.toBe(0x7fff);
      }
    }
  });

  it('rejects invalid inputs', () => {
    expect(() => generateFormatInfo('X' as ECLevel, 0)).toThrow(RangeError);
    expect(() => generateFormatInfo('L', -1 as MaskPattern)).toThrow(RangeError);
    expect(() => generateFormatInfo('L', 8 as MaskPattern)).toThrow(RangeError);
    expect(() => generateFormatInfo('L', 1.5 as MaskPattern)).toThrow(RangeError);
  });
});

describe('placeFormatInfo', () => {
  function zeroMatrix(size: number): number[][] {
    return Array.from({ length: size }, () => new Array<number>(size).fill(0));
  }

  function readCopy1(matrix: number[][]): number {
    // Vertical part: rows 0-5 (bits 0-5), row 7 (bit 6), row 8 (bit 7);
    // horizontal part: cols 5-0 (bits 9-14), col 7 (bit 8).
    let bits = 0;
    for (let i = 0; i < 6; i++) bits |= matrix[i]![8]! << i;
    bits |= matrix[7]![8]! << 6;
    bits |= matrix[8]![8]! << 7;
    bits |= matrix[8]![7]! << 8;
    for (let i = 9; i < 15; i++) bits |= matrix[8]![14 - i]! << i;
    return bits;
  }

  function readCopy2(matrix: number[][], size: number): number {
    let bits = 0;
    for (let i = 0; i < 8; i++) bits |= matrix[8]![size - 1 - i]! << i;
    for (let i = 8; i < 15; i++) bits |= matrix[size - 15 + i]![8]! << i;
    return bits;
  }

  it('writes both copies identically for all 32 combinations', () => {
    for (const level of LEVELS) {
      for (let mask = 0 as MaskPattern; mask <= 7; mask++) {
        for (const size of [21, 45, 177]) {
          const m = zeroMatrix(size);
          placeFormatInfo(m, level, mask);
          const expected = generateFormatInfo(level, mask);
          expect(readCopy1(m), `copy1 ${level}/${mask} size ${size}`).toBe(expected);
          expect(readCopy2(m, size), `copy2 ${level}/${mask} size ${size}`).toBe(expected);
        }
      }
    }
  });

  it('never overwrites the dark module at (size - 8, 8)', () => {
    const size = 21;
    const m = zeroMatrix(size);
    m[size - 8]![8] = 1;
    placeFormatInfo(m, 'H', 7);
    expect(m[size - 8]![8]).toBe(1);
  });

  it('leaves the timing cells at (8, 6) and (6, 8) untouched', () => {
    const size = 21;
    const m = zeroMatrix(size);
    m[8]![6] = 1;
    m[6]![8] = 1;
    placeFormatInfo(m, 'Q', 3);
    expect(m[8]![6]).toBe(1);
    expect(m[6]![8]).toBe(1);
  });
});
