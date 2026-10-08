import { describe, expect, it } from 'vitest';
import BitMatrixRef from 'qrcode/lib/core/bit-matrix.js';
import {
  applyMask as refApplyMask,
  getPenaltyN1,
  getPenaltyN2,
  getPenaltyN3,
  getPenaltyN4,
} from 'qrcode/lib/core/mask-pattern.js';
import {
  applyMask,
  calculatePenalty,
  findBestMask,
  isMasked,
  penaltyN1,
  penaltyN2,
  penaltyN3,
  penaltyN4,
} from '../src/core/mask';
import { placeFormatInfo } from '../src/core/format';
import type { MaskPattern } from '../src/core/types';

function zeros(size: number): number[][] {
  return Array.from({ length: size }, () => new Array<number>(size).fill(0));
}

function noReservation(size: number): boolean[][] {
  return Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
}

/** Deterministic pseudo-random matrix for parity checks. */
function randomMatrix(size: number, seed: number): number[][] {
  let s = seed;
  const next = (): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s;
  };
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => (next() % 2 === 0 ? 1 : 0)),
  );
}

describe('isMasked', () => {
  it('matches the eight standard formulas on samples', () => {
    const expectations: [number, number, MaskPattern, boolean][] = [
      [0, 0, 0, true],
      [0, 1, 0, false],
      [1, 0, 0, false],
      [1, 0, 1, false],
      [0, 0, 1, true],
      [2, 3, 1, true],
      [2, 3, 2, true],
      [2, 4, 2, false],
      [1, 0, 3, false],
      [2, 3, 3, false],
      [2, 3, 4, true],
      [2, 3, 5, true],
      [2, 3, 6, true],
      [2, 3, 7, false],
      [5, 7, 4, true],
      [5, 7, 5, false],
    ];
    for (const [row, col, mask, expected] of expectations) {
      expect(isMasked(row, col, mask), `${mask}(${row},${col})`).toBe(expected);
    }
  });

  it('is xor-involutive: applying twice restores the matrix', () => {
    for (let mask = 0 as MaskPattern; mask <= 7; mask++) {
      const m = randomMatrix(21, mask + 1);
      const backup = m.map((r) => [...r]);
      const res = noReservation(21);
      applyMask(m, res, mask);
      applyMask(m, res, mask);
      expect(m, `mask ${mask}`).toEqual(backup);
    }
  });

  it('rejects invalid patterns', () => {
    expect(() => isMasked(0, 0, 8 as MaskPattern)).toThrow(RangeError);
    expect(() => applyMask(zeros(5), noReservation(5), -1 as MaskPattern)).toThrow(RangeError);
  });
});

describe('applyMask', () => {
  it('never touches reserved modules', () => {
    const m = randomMatrix(21, 42);
    const backup = m.map((r) => [...r]);
    const res = noReservation(21);
    res[0]![0] = true;
    res[5]![7] = true;
    res[20]![20] = true;
    applyMask(m, res, 0);

    expect(m[0]![0]).toBe(backup[0]![0]);
    expect(m[5]![7]).toBe(backup[5]![7]);
    expect(m[20]![20]).toBe(backup[20]![20]);
    // Some non-reserved cell that the mask inverts must differ:
    // mask 0 inverts (r + c) even, e.g. (1, 1); (0, 1) stays untouched.
    expect(m[1]![1]).toBe(backup[1]![1]! ^ 1);
    expect(m[0]![1]).toBe(backup[0]![1]);
  });

  it('matches the qrcode reference for all 8 masks', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const size = 25;
      const base = randomMatrix(size, seed * 7);
      const res = noReservation(size);
      // Scattered reserved cells.
      for (let i = 0; i < size; i++) res[i]![i] = true;
      res[0]![size - 1] = true;

      for (let mask = 0 as MaskPattern; mask <= 7; mask++) {
        const ours = base.map((r) => [...r]);
        applyMask(ours, res, mask);

        const ref = new BitMatrixRef(size);
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            ref.set(r, c, base[r]![c], res[r]![c]);
          }
        }
        refApplyMask(mask, ref);

        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            expect(ours[r]![c], `mask ${mask} (${r},${c})`).toBe(ref.get(r, c));
          }
        }
      }
    }
  });
});

describe('penalty rules', () => {
  it('N1: runs of 4 cost nothing, 5 cost 3, 8 cost 6', () => {
    // All-dark 4x4: every run is exactly 4 -> 0 points.
    expect(penaltyN1(zeros(4).map((r) => r.fill(1)))).toBe(0);
    // All-dark 5x5: rows 5 * 3 + cols 5 * 3 = 30.
    expect(penaltyN1(zeros(5).map((r) => r.fill(1)))).toBe(30);
    // All-dark 8x8: each run of 8 -> 3 + 3 = 6; 8 rows + 8 cols -> 96.
    expect(penaltyN1(zeros(8).map((r) => r.fill(1)))).toBe(96);
    // All-light 6x6: light runs count too: 6 rows + 6 cols * (3+1) = 48.
    expect(penaltyN1(zeros(6))).toBe(48);
  });

  it('N2: 3 points per monochrome 2x2, overlapping counts', () => {
    // All-dark 3x3 -> 4 windows * 3 = 12.
    expect(penaltyN2(zeros(3).map((r) => r.fill(1)))).toBe(12);
    // All-dark 5x5 -> 16 * 3 = 48.
    expect(penaltyN2(zeros(5).map((r) => r.fill(1)))).toBe(48);
    // Checkerboard -> every window mixed -> 0.
    const board = Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 5 }, (_, c) => (r + c) % 2),
    );
    expect(penaltyN2(board)).toBe(0);
    // Exactly one dark 2x2 in the corner of a light field.
    const one = zeros(3);
    one[0]![0] = 1;
    one[0]![1] = 1;
    one[1]![0] = 1;
    one[1]![1] = 1;
    expect(penaltyN2(one)).toBe(3);
  });

  it('N3: needs the 4-light neighbourhood', () => {
    // 11x11, row0 = 10111010000 -> one match -> 40.
    const withLight = zeros(11);
    withLight[0] = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    expect(penaltyN3(withLight)).toBe(40);

    // Bare 1011101 without 4 light modules on either side -> 0.
    const bare = zeros(11);
    bare[0] = [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1];
    expect(penaltyN3(bare)).toBe(0);

    // Light areas on BOTH sides -> two overlapping windows -> 80.
    const both = zeros(15);
    both[0] = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    expect(penaltyN3(both)).toBe(80);

    // Column direction: transpose of the first case.
    const colCase = zeros(11);
    for (let r = 0; r < 11; r++) colCase[r]![0] = withLight[0]![r]!;
    expect(penaltyN3(colCase)).toBe(40);
  });

  it('N4: 50% costs 0, boundaries pinned to reference semantics', () => {
    // Exactly 50% dark (10x10, half dark).
    const half = zeros(10);
    for (let r = 0; r < 10; r++) for (let c = 0; c < 5; c++) half[r]![c] = 1;
    expect(penaltyN4(half)).toBe(0);

    // 100% dark -> |ceil(20) - 10| * 10 = 100.
    expect(penaltyN4(zeros(10).map((r) => r.fill(1)))).toBe(100);
    // 0% dark -> same deviation.
    expect(penaltyN4(zeros(10))).toBe(100);

    // 51% dark (51 of 100): ceil(10.2) = 11 -> 10.
    const p51 = zeros(10);
    for (let i = 0; i < 51; i++) p51[Math.floor(i / 10)]![i % 10] = 1;
    expect(penaltyN4(p51)).toBe(10);

    // 56% dark: ceil(11.2) = 12 -> 20.
    const p56 = zeros(10);
    for (let i = 0; i < 56; i++) p56[Math.floor(i / 10)]![i % 10] = 1;
    expect(penaltyN4(p56)).toBe(20);
  });

  it('matches the qrcode reference components on assorted matrices', () => {
    const cases: number[][][] = [
      zeros(9),
      zeros(9).map((r) => r.fill(1)),
      randomMatrix(15, 3),
      randomMatrix(21, 77),
      randomMatrix(31, 999),
    ];
    // Add a run-heavy case.
    const run = randomMatrix(17, 5);
    for (let c = 0; c < 9; c++) run[3]![c] = 1;
    cases.push(run);

    for (const m of cases) {
      const ref = new BitMatrixRef(m.length);
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m.length; c++) ref.set(r, c, m[r]![c]);
      }
      expect(penaltyN1(m), 'N1').toBe(getPenaltyN1(ref));
      expect(penaltyN2(m), 'N2').toBe(getPenaltyN2(ref));
      expect(penaltyN3(m), 'N3').toBe(getPenaltyN3(ref));
      expect(penaltyN4(m), 'N4').toBe(getPenaltyN4(ref));
      expect(calculatePenalty(m), 'total').toBe(
        getPenaltyN1(ref) + getPenaltyN2(ref) + getPenaltyN3(ref) + getPenaltyN4(ref),
      );
    }
  });
});

describe('findBestMask', () => {
  it('returns a valid mask and restores unmasked data cells', () => {
    const size = 21;
    const base = randomMatrix(size, 123);
    const res = noReservation(size);
    for (let i = 0; i < size; i++) {
      res[i]![6] = true;
      res[6]![i] = true;
    }
    // Reserve the format areas — findBestMask rewrites them per candidate.
    for (let i = 0; i < size; i++) {
      res[8]![i] = true;
      res[i]![8] = true;
    }
    const backup = base.map((r) => [...r]);

    const m = base.map((r) => [...r]);
    const chosen = findBestMask(m, res, 'M');

    expect(chosen).toBeGreaterThanOrEqual(0);
    expect(chosen).toBeLessThanOrEqual(7);
    // The evaluation loop must leave non-reserved cells exactly as they were
    // (every candidate mask is undone before the next iteration).
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!res[r]![c]) {
          expect(m[r]![c], `cell ${r},${c}`).toBe(backup[r]![c]);
        }
      }
    }
  });

  it('picks the argmin under independent (qrcode reference) scoring', () => {
    const size = 21;
    const base = randomMatrix(size, 777);
    const res = noReservation(size);
    for (let i = 0; i < size; i++) res[i]![i] = true;

    const chosen = findBestMask(
      base.map((r) => [...r]),
      res,
      'Q',
    );

    const refPenalty = (m: number[][]): number => {
      const ref = new BitMatrixRef(size);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) ref.set(r, c, m[r]![c]);
      }
      return (
        getPenaltyN1(ref) + getPenaltyN2(ref) + getPenaltyN3(ref) + getPenaltyN4(ref)
      );
    };

    let best = 0;
    let lower = Infinity;
    for (let p = 0 as MaskPattern; p <= 7; p++) {
      const m = base.map((r) => [...r]);
      placeFormatInfo(m, 'Q', p);
      applyMask(m, res, p);
      const penalty = refPenalty(m);
      applyMask(m, res, p);
      if (penalty < lower) {
        lower = penalty;
        best = p;
      }
    }

    expect(chosen).toBe(best);
  });
});
