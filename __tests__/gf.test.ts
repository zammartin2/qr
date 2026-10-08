import { describe, expect, it } from 'vitest';
import { mul as refGfMul } from 'qrcode/lib/core/galois-field.js';
import {
  GF_EXP,
  GF_LOG,
  gfDiv,
  gfInv,
  gfMul,
  gfPolyEval,
  gfPolyMul,
  gfPow,
} from '../src/core/gf';

describe('GF(256) tables', () => {
  it('EXP[255] wraps to 1 (order of the generator)', () => {
    expect(GF_EXP[255]).toBe(1);
    expect(GF_EXP[0]).toBe(1);
  });

  it('EXP and LOG are mutually inverse for all 255 non-zero elements', () => {
    for (let a = 1; a < 256; a++) {
      expect(GF_EXP[GF_LOG[a]!]).toBe(a);
      expect(GF_LOG[GF_EXP[a % 255]!]).toBe(a % 255);
    }
  });

  it('LOG covers every non-zero byte exactly once', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 255; i++) seen.add(GF_EXP[i]!);
    expect(seen.size).toBe(255);
    expect(seen.has(0)).toBe(false);
  });

  it('EXP wrap-around half matches the first half', () => {
    for (let i = 255; i < 512; i++) {
      expect(GF_EXP[i]).toBe(GF_EXP[i - 255]);
    }
  });
});

describe('gfMul', () => {
  it('agrees with the qrcode reference implementation', () => {
    for (let a = 0; a < 256; a += 3) {
      for (let b = 0; b < 256; b += 7) {
        expect(gfMul(a, b), `${a}*${b}`).toBe(refGfMul(a, b));
      }
    }
    // Pinned anchor in GF(2^8)/0x11D (carryless product reduced by 0x11D).
    expect(gfMul(0x53, 0xca)).toBe(143);
    expect(refGfMul(0x53, 0xca)).toBe(143);
  });

  it('is commutative on samples', () => {
    const pairs: [number, number][] = [
      [1, 1],
      [2, 3],
      [0x53, 0xca],
      [255, 128],
      [173, 42],
    ];
    for (const [a, b] of pairs) {
      expect(gfMul(a, b)).toBe(gfMul(b, a));
    }
  });

  it('has identity 1 and absorbing 0', () => {
    for (let a = 0; a < 256; a++) {
      expect(gfMul(a, 1)).toBe(a);
      expect(gfMul(1, a)).toBe(a);
      expect(gfMul(a, 0)).toBe(0);
      expect(gfMul(0, a)).toBe(0);
    }
  });

  it('agrees with EXP/LOG tables', () => {
    for (let a = 1; a < 256; a += 7) {
      for (let b = 1; b < 256; b += 11) {
        expect(gfMul(a, b)).toBe(GF_EXP[GF_LOG[a]! + GF_LOG[b]!]);
      }
    }
  });
});

describe('gfInv / gfDiv / gfPow', () => {
  it('a * inv(a) === 1 for all non-zero a', () => {
    for (let a = 1; a < 256; a++) {
      expect(gfMul(a, gfInv(a))).toBe(1);
    }
  });

  it('gfInv(0) throws', () => {
    expect(() => gfInv(0)).toThrow(RangeError);
  });

  it('gfDiv inverts gfMul', () => {
    for (let a = 0; a < 256; a += 3) {
      for (let b = 1; b < 256; b += 5) {
        expect(gfMul(gfDiv(a, b), b)).toBe(a);
      }
    }
  });

  it('gfDiv by zero throws; gfDiv(0, b) === 0', () => {
    expect(() => gfDiv(1, 0)).toThrow(RangeError);
    expect(gfDiv(0, 7)).toBe(0);
  });

  it('gfPow matches EXP table', () => {
    expect(gfPow(0)).toBe(1);
    expect(gfPow(1)).toBe(2);
    expect(gfPow(255)).toBe(1);
    expect(gfPow(8)).toBe(GF_EXP[8]);
  });
});

describe('gfPolyMul', () => {
  it('multiplies by identity polynomial [1]', () => {
    expect(gfPolyMul([1, 2, 3], [1])).toEqual([1, 2, 3]);
    expect(gfPolyMul([1], [5, 6])).toEqual([5, 6]);
  });

  it('produces the correct product (x + 1)(x + 1) = x^2 (char 2)', () => {
    // (x+1)^2 = x^2 + 2x + 1 = x^2 + 1 in GF(2^8)
    expect(gfPolyMul([1, 1], [1, 1])).toEqual([1, 0, 1]);
  });

  it('has degree deg(p) + deg(q)', () => {
    const p = [1, 2, 3, 4];
    const q = [5, 6];
    expect(gfPolyMul(p, q)).toHaveLength(p.length + q.length - 1);
  });

  it('multiplies by zero polynomial', () => {
    expect(gfPolyMul([0, 0], [1, 2, 3])).toEqual([0, 0, 0, 0]);
  });
});

describe('gfPolyEval', () => {
  it('evaluates constants', () => {
    expect(gfPolyEval([42], 5)).toBe(42);
    expect(gfPolyEval([], 5)).toBe(0);
  });

  it('evaluates linear and quadratic polynomials by hand', () => {
    // p(x) = x + 1 at x = 2 -> 3
    expect(gfPolyEval([1, 1], 2)).toBe(3);
    // p(x) = x^2 at x = 3 -> 3*3 = 5 (carryless: 0b11 * 0b11 = 0b101)
    expect(gfPolyEval([1, 0, 0], 3)).toBe(5);
  });

  it('every root of the RS generator polynomial evaluates to 0', () => {
    for (const nsym of [7, 10, 13, 18, 30]) {
      // Build generator as product of (x - a^i).
      let g = [1];
      for (let i = 0; i < nsym; i++) {
        g = gfPolyMul(g, [1, GF_EXP[i]!]);
      }
      for (let i = 0; i < nsym; i++) {
        expect(gfPolyEval(g, GF_EXP[i]!)).toBe(0);
      }
    }
  });
});
