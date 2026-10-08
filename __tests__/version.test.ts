import { describe, expect, it } from 'vitest';
import { getEncodedBits as refVersionBits } from 'qrcode/lib/core/version.js';
import { getDataCodewords } from '../src/core/ec-blocks';
import {
  chooseVersion,
  generateVersionInfo,
  payloadBits,
  requiredBits,
  symbolSize,
} from '../src/core/version';
import type { ECLevel, Mode } from '../src/core/types';

describe('symbolSize', () => {
  it('computes 4v + 17', () => {
    expect(symbolSize(1)).toBe(21);
    expect(symbolSize(2)).toBe(25);
    expect(symbolSize(7)).toBe(45);
    expect(symbolSize(40)).toBe(177);
  });

  it('rejects invalid versions', () => {
    expect(() => symbolSize(0)).toThrow(RangeError);
    expect(() => symbolSize(41)).toThrow(RangeError);
    expect(() => symbolSize(2.5)).toThrow(RangeError);
  });
});

describe('payloadBits', () => {
  it('computes payload sizes per mode', () => {
    expect(payloadBits('numeric', 0)).toBe(0);
    expect(payloadBits('numeric', 7)).toBe(24);
    expect(payloadBits('alphanumeric', 11)).toBe(61);
    expect(payloadBits('byte', 17)).toBe(136);
    expect(payloadBits('kanji', 5)).toBe(65);
  });

  it('rejects negative counts and unknown modes', () => {
    expect(() => payloadBits('byte', -1)).toThrow(RangeError);
    expect(() => payloadBits('byte', 1.5)).toThrow(RangeError);
    expect(() => payloadBits('emoji' as Mode, 1)).toThrow(RangeError);
  });
});

describe('requiredBits', () => {
  it('is mode indicator + count indicator + payload', () => {
    expect(requiredBits('numeric', 3, 1)).toBe(4 + 10 + 10);
    expect(requiredBits('alphanumeric', 11, 1)).toBe(4 + 9 + 61);
    expect(requiredBits('byte', 17, 1)).toBe(4 + 8 + 136);
    expect(requiredBits('kanji', 1, 1)).toBe(4 + 8 + 13);
  });

  it('uses the correct count width per version group', () => {
    // byte: 8 bits below v10, 16 from v10 on.
    expect(requiredBits('byte', 5, 9)).toBe(4 + 8 + 40);
    expect(requiredBits('byte', 5, 10)).toBe(4 + 16 + 40);
    expect(requiredBits('byte', 5, 26)).toBe(4 + 16 + 40);
    expect(requiredBits('byte', 5, 27)).toBe(4 + 16 + 40);
    // numeric: 10 / 12 / 14.
    expect(requiredBits('numeric', 3, 9)).toBe(4 + 10 + 10);
    expect(requiredBits('numeric', 3, 10)).toBe(4 + 12 + 10);
    expect(requiredBits('numeric', 3, 26)).toBe(4 + 12 + 10);
    expect(requiredBits('numeric', 3, 27)).toBe(4 + 14 + 10);
  });

  it('rejects invalid inputs', () => {
    expect(() => requiredBits('byte', 1, 0)).toThrow(RangeError);
    expect(() => requiredBits('byte', 1, 41)).toThrow(RangeError);
    expect(() => requiredBits('wat' as Mode, 1, 1)).toThrow(RangeError);
  });
});

describe('chooseVersion', () => {
  it('picks the minimal fitting version', () => {
    // 14 bytes fit v1-M (16 data codewords = 128 bits; 4+8+112 = 124 <= 128).
    expect(chooseVersion({ mode: 'byte', count: 14, ecLevel: 'M' })).toBe(1);
    // 15 bytes need v2.
    expect(chooseVersion({ mode: 'byte', count: 15, ecLevel: 'M' })).toBe(2);
    // 0 bytes (empty string) always fits v1.
    expect(chooseVersion({ mode: 'byte', count: 0, ecLevel: 'H' })).toBe(1);
  });

  it('respects the EC level', () => {
    // 17 bytes: v1-L holds exactly 17 (4+8+136 = 148 <= 152).
    expect(chooseVersion({ mode: 'byte', count: 17, ecLevel: 'L' })).toBe(1);
    // v1-H only holds 7.
    expect(chooseVersion({ mode: 'byte', count: 7, ecLevel: 'H' })).toBe(1);
    expect(chooseVersion({ mode: 'byte', count: 8, ecLevel: 'H' })).toBe(2);
  });

  it('respects minVersion / maxVersion', () => {
    expect(chooseVersion({ mode: 'byte', count: 5, ecLevel: 'M', minVersion: 5 })).toBe(5);
    expect(
      chooseVersion({ mode: 'byte', count: 5, ecLevel: 'M', minVersion: 2, maxVersion: 3 }),
    ).toBe(2);
    // Data too big for maxVersion within the range -> error.
    expect(() =>
      chooseVersion({ mode: 'byte', count: 500, ecLevel: 'H', maxVersion: 3 }),
    ).toThrow(RangeError);
  });

  it('throws when no version in range fits', () => {
    expect(() => chooseVersion({ mode: 'byte', count: 3000, ecLevel: 'H' })).toThrow(
      /data too long/,
    );
    expect(() =>
      chooseVersion({ mode: 'byte', count: 4000, ecLevel: 'L', maxVersion: 40 }),
    ).toThrow(RangeError);
  });

  it('throws on invalid ranges', () => {
    expect(() => chooseVersion({ mode: 'byte', count: 1, ecLevel: 'L', minVersion: 5, maxVersion: 4 })).toThrow(RangeError);
    expect(() => chooseVersion({ mode: 'byte', count: 1, ecLevel: 'L', minVersion: 0 })).toThrow(RangeError);
    expect(() => chooseVersion({ mode: 'byte', count: 1, ecLevel: 'L', maxVersion: 41 })).toThrow(RangeError);
  });

  it('agrees with getDataCodewords capacity boundaries', () => {
    // For each level, the chosen version is the first where required bits fit.
    const levels: ECLevel[] = ['L', 'M', 'Q', 'H'];
    for (const ec of levels) {
      for (const count of [1, 10, 50, 100, 255]) {
        const v = chooseVersion({ mode: 'byte', count, ecLevel: ec });
        const capacity = getDataCodewords(v, ec) * 8;
        expect(requiredBits('byte', count, v)).toBeLessThanOrEqual(capacity);
        if (v > 1) {
          const prevCap = getDataCodewords(v - 1, ec) * 8;
          expect(requiredBits('byte', count, v - 1)).toBeGreaterThan(prevCap);
        }
      }
    }
  });
});

describe('generateVersionInfo', () => {
  it('matches the ISO anchor for version 7', () => {
    expect(generateVersionInfo(7)).toBe(0x07c94);
    expect(generateVersionInfo(7).toString(2).padStart(18, '0')).toBe(
      '000111110010010100',
    );
  });

  it('matches the qrcode reference for v7-40', () => {
    for (let v = 7; v <= 40; v++) {
      expect(generateVersionInfo(v), `v${v}`).toBe(refVersionBits(v));
    }
  });

  it('rejects versions outside 7-40', () => {
    expect(() => generateVersionInfo(6)).toThrow(RangeError);
    expect(() => generateVersionInfo(1)).toThrow(RangeError);
    expect(() => generateVersionInfo(41)).toThrow(RangeError);
    expect(() => generateVersionInfo(7.5)).toThrow(RangeError);
  });
});
