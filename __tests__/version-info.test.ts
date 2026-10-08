import { describe, expect, it } from 'vitest';
import { getSymbolTotalCodewords } from 'qrcode/lib/core/utils.js';
import { TOTAL_CODEWORDS, getVersionInfo, VERSION_INFO } from '../src/core/version-info';

describe('TOTAL_CODEWORDS', () => {
  it('has entries for all 40 versions', () => {
    expect(TOTAL_CODEWORDS).toHaveLength(41); // index 0 unused
    expect(VERSION_INFO).toHaveLength(40);
  });

  it('matches the qrcode reference for every version', () => {
    for (let v = 1; v <= 40; v++) {
      expect(TOTAL_CODEWORDS[v]).toBe(getSymbolTotalCodewords(v));
    }
  });

  it('contains known anchors', () => {
    expect(TOTAL_CODEWORDS[1]).toBe(26);
    expect(TOTAL_CODEWORDS[7]).toBe(196);
    expect(TOTAL_CODEWORDS[40]).toBe(3706);
  });

  it('is strictly increasing', () => {
    for (let v = 2; v <= 40; v++) {
      expect(TOTAL_CODEWORDS[v]!).toBeGreaterThan(TOTAL_CODEWORDS[v - 1]!);
    }
  });
});

describe('getVersionInfo', () => {
  it('returns total codewords and alignment for v1', () => {
    const info = getVersionInfo(1);
    expect(info.totalCodewords).toBe(26);
    expect(info.alignment).toEqual([]);
  });

  it('returns alignment coordinates for v7', () => {
    expect(getVersionInfo(7).alignment).toEqual([6, 22, 38]);
    expect(getVersionInfo(7).totalCodewords).toBe(196);
  });

  it('returns alignment coordinates for v40', () => {
    expect(getVersionInfo(40).alignment).toEqual([6, 30, 58, 86, 114, 142, 170]);
    expect(getVersionInfo(40).totalCodewords).toBe(3706);
  });

  it('rejects invalid versions', () => {
    expect(() => getVersionInfo(0)).toThrow(RangeError);
    expect(() => getVersionInfo(41)).toThrow(RangeError);
    expect(() => getVersionInfo(2.5)).toThrow(RangeError);
  });
});
