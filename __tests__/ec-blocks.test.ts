import { describe, expect, it } from 'vitest';
import { getBlocksCount, getTotalCodewordsCount } from 'qrcode/lib/core/error-correction-code.js';
import ECLevelRef from 'qrcode/lib/core/error-correction-level.js';
import { EC_BLOCKS, getDataCodewords, getECBlocks } from '../src/core/ec-blocks';
import { TOTAL_CODEWORDS } from '../src/core/version-info';
import type { ECLevel } from '../src/core/types';

const LEVELS: ECLevel[] = ['L', 'M', 'Q', 'H'];

const REF_LEVEL = {
  L: ECLevelRef.L,
  M: ECLevelRef.M,
  Q: ECLevelRef.Q,
  H: ECLevelRef.H,
} as const;

describe('EC_BLOCKS table', () => {
  it('covers all 40 versions for each EC level', () => {
    for (const level of LEVELS) {
      expect(EC_BLOCKS[level]).toHaveLength(40);
    }
  });

  it('matches the qrcode reference block counts for all 160 combinations', () => {
    for (let v = 1; v <= 40; v++) {
      for (const level of LEVELS) {
        const info = getECBlocks(v, level);
        const blocks = info.numBlocksGroup1 + info.numBlocksGroup2;
        expect(blocks, `blocks v${v}-${level}`).toBe(getBlocksCount(v, REF_LEVEL[level]));
        const totalEc = blocks * info.ecPerBlock;
        expect(totalEc, `totalEC v${v}-${level}`).toBe(
          getTotalCodewordsCount(v, REF_LEVEL[level]),
        );
      }
    }
  });

  it('holds structural invariants for all 160 combinations', () => {
    for (let v = 1; v <= 40; v++) {
      for (const level of LEVELS) {
        const info = getECBlocks(v, level);
        expect(info.ecPerBlock).toBeGreaterThanOrEqual(7);
        expect(info.ecPerBlock).toBeLessThanOrEqual(30);
        expect(info.numBlocksGroup1).toBeGreaterThan(0);
        expect(info.dataCodewordsGroup1).toBeGreaterThan(0);

        if (info.numBlocksGroup2 === 0) {
          expect(info.dataCodewordsGroup2).toBe(0);
        } else {
          expect(info.dataCodewordsGroup2).toBe(info.dataCodewordsGroup1 + 1);
        }

        const dataTotal =
          info.numBlocksGroup1 * info.dataCodewordsGroup1 +
          info.numBlocksGroup2 * info.dataCodewordsGroup2;
        const total =
          dataTotal + (info.numBlocksGroup1 + info.numBlocksGroup2) * info.ecPerBlock;
        expect(total, `total v${v}-${level}`).toBe(TOTAL_CODEWORDS[v]);
      }
    }
  });

  it('matches ISO byte-capacity anchors', () => {
    // (version, level) -> data codewords, derived from ISO Table 7 byte capacities.
    const anchors: [number, ECLevel, number][] = [
      [1, 'L', 19],
      [1, 'M', 16],
      [1, 'Q', 13],
      [1, 'H', 9],
      [2, 'L', 34],
      [5, 'Q', 62],
      [10, 'L', 274],
      [10, 'M', 216],
      [10, 'Q', 154],
      [10, 'H', 122],
      [40, 'L', 2956],
      [40, 'M', 2334],
      [40, 'Q', 1666],
      [40, 'H', 1276],
    ];
    for (const [v, level, dataCw] of anchors) {
      expect(getDataCodewords(v, level), `v${v}-${level}`).toBe(dataCw);
    }
  });
});

describe('getECBlocks', () => {
  it('returns the layout for known combinations', () => {
    expect(getECBlocks(1, 'L')).toEqual({
      ecPerBlock: 7,
      numBlocksGroup1: 1,
      numBlocksGroup2: 0,
      dataCodewordsGroup1: 19,
      dataCodewordsGroup2: 0,
    });
    // v5-Q: 4 blocks, 72 EC total -> 18 each; 62 data -> 2x15 + 2x16.
    expect(getECBlocks(5, 'Q')).toEqual({
      ecPerBlock: 18,
      numBlocksGroup1: 2,
      numBlocksGroup2: 2,
      dataCodewordsGroup1: 15,
      dataCodewordsGroup2: 16,
    });
  });

  it('rejects invalid version or EC level', () => {
    expect(() => getECBlocks(0, 'L')).toThrow(RangeError);
    expect(() => getECBlocks(41, 'L')).toThrow(RangeError);
    expect(() => getECBlocks(1.5, 'L')).toThrow(RangeError);
    expect(() => getECBlocks(1, 'X' as ECLevel)).toThrow(RangeError);
  });
});

describe('getDataCodewords', () => {
  it('rejects invalid inputs', () => {
    expect(() => getDataCodewords(0, 'M')).toThrow(RangeError);
    expect(() => getDataCodewords(1, 'Z' as ECLevel)).toThrow(RangeError);
  });
});
