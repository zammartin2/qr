import { describe, expect, it } from 'vitest';
import RSEncoder from 'qrcode/lib/core/reed-solomon-encoder.js';
import { GF_EXP, gfPolyEval } from '../src/core/gf';
import {
  interleaveBlocks,
  rsCheckSyndromes,
  rsEncode,
  rsEncodeBlock,
  rsGeneratorPoly,
} from '../src/core/rs';

describe('rsGeneratorPoly', () => {
  it('matches the known ISO/Thonky generator for 7 EC codewords', () => {
    expect(rsGeneratorPoly(7)).toEqual([1, 127, 122, 154, 164, 11, 68, 117]);
  });

  it('starts with leading coefficient 1 and has degree nsym', () => {
    for (const nsym of [7, 10, 13, 16, 18, 30]) {
      const g = rsGeneratorPoly(nsym);
      expect(g).toHaveLength(nsym + 1);
      expect(g[0]).toBe(1);
    }
  });

  it('is memoized (same reference on repeat calls)', () => {
    expect(rsGeneratorPoly(10)).toBe(rsGeneratorPoly(10));
  });

  it('rejects invalid degrees', () => {
    expect(() => rsGeneratorPoly(0)).toThrow(RangeError);
    expect(() => rsGeneratorPoly(-3)).toThrow(RangeError);
    expect(() => rsGeneratorPoly(2.5)).toThrow(RangeError);
  });
});

describe('rsEncode', () => {
  it('produces syndromes of zero (valid codeword property)', () => {
    const cases: [number[], number][] = [
      [[1, 2, 3, 4, 5], 7],
      [[0, 0, 0, 0], 10],
      [[255, 254, 253], 13],
      [Array.from({ length: 100 }, (_, i) => (i * 37) % 256), 18],
      [Array.from({ length: 200 }, (_, i) => (i * 91 + 7) % 256), 30],
    ];
    for (const [data, nsym] of cases) {
      const ec = rsEncode(data, nsym);
      expect(ec).toHaveLength(nsym);
      expect(rsCheckSyndromes([...data, ...ec], nsym)).toBe(true);
    }
  });

  it('agrees byte-for-byte with the qrcode reference encoder', () => {
    for (const nsym of [7, 10, 13, 18, 30]) {
      const ref = new RSEncoder(nsym);
      for (let seed = 0; seed < 20; seed++) {
        const data = Array.from({ length: 15 + seed * 3 }, (_, i) => (i * 61 + seed * 17) % 256);
        const ours = rsEncode(data, nsym);
        const theirs = Array.from(ref.encode(Uint8Array.from(data)));
        expect(ours).toEqual(theirs);
      }
    }
  });

  it('rejects empty data', () => {
    expect(() => rsEncode([], 7)).toThrow(RangeError);
  });

  it('detects corrupted codewords via syndromes', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const full = rsEncodeBlock(data, 7);
    expect(rsCheckSyndromes(full, 7)).toBe(true);
    // Flip one bit -> some syndrome becomes non-zero.
    const corrupted = [...full];
    corrupted[3]! ^= 1;
    expect(rsCheckSyndromes(corrupted, 7)).toBe(false);
    // Flipping an EC codeword must also be detected.
    const corruptedEc = [...full];
    corruptedEc[full.length - 1]! ^= 1;
    expect(rsCheckSyndromes(corruptedEc, 7)).toBe(false);
  });
});

describe('rsEncodeBlock', () => {
  it('appends EC codewords after the data', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const block = rsEncodeBlock(data, 7);
    expect(block).toHaveLength(data.length + 7);
    expect(block.slice(0, data.length)).toEqual(data);
    expect(block.slice(data.length)).toEqual(rsEncode(data, 7));
  });
});

describe('interleaveBlocks', () => {
  it('interleaves equal-length blocks: data first, then EC', () => {
    // Two blocks, 3 data + 2 EC each.
    const blocks = [
      [1, 2, 3, 101, 102],
      [4, 5, 6, 104, 105],
    ];
    expect(interleaveBlocks(blocks, [3, 3])).toEqual([
      1, 4, 2, 5, 3, 6, 101, 104, 102, 105,
    ]);
  });

  it('skips exhausted data in shorter (group 1) blocks — v5-Q layout', () => {
    // v5-Q: 2 blocks x 15 data + 2 blocks x 16 data, 18 EC each.
    const dataLengths = [15, 15, 16, 16];
    const blocks = dataLengths.map((len, b) => [
      ...Array.from({ length: len }, (_, i) => b * 100 + i),
      ...Array.from({ length: 18 }, (_, i) => 1000 + b * 100 + i),
    ]);

    const out = interleaveBlocks(blocks, dataLengths);

    // First data column: 0, 100, 200, 300.
    expect(out.slice(0, 4)).toEqual([0, 100, 200, 300]);
    // At data index 15 only blocks 2 and 3 contribute: 215, 315.
    expect(out.slice(60, 62)).toEqual([215, 315]);
    // Total = data codewords (62) + EC (72) = 134 for v5-Q.
    expect(out).toHaveLength(134);
    // Data section: 62 values, EC starts after.
    const dataSection = out.slice(0, 62);
    expect(new Set(dataSection).size).toBe(62);
    // First EC column: 1000, 1100, 1200, 1300.
    expect(out.slice(62, 66)).toEqual([1000, 1100, 1200, 1300]);
  });

  it('handles a single block', () => {
    expect(interleaveBlocks([[9, 8, 7, 1]], [3])).toEqual([9, 8, 7, 1]);
  });

  it('throws when blocks and dataLengths differ in length', () => {
    expect(() => interleaveBlocks([[1]], [])).toThrow(RangeError);
    expect(() => interleaveBlocks([], [1])).toThrow(RangeError);
  });

  it('throws when a block is shorter than its declared data length', () => {
    expect(() => interleaveBlocks([[1, 2]], [5])).toThrow(RangeError);
  });
});

describe('gfPolyEval syndromes via GF_EXP (sanity)', () => {
  it('a valid codeword evaluates to 0 at all alpha^i', () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17, 236, 17];
    const ec = rsEncode(data, 10);
    const full = [...data, ...ec];
    for (let i = 0; i < 10; i++) {
      expect(gfPolyEval(full, GF_EXP[i]!)).toBe(0);
    }
  });
});
