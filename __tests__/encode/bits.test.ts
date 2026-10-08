import { describe, expect, it } from 'vitest';
import { addPadding, addTerminator, packBits, pushBits } from '../../src/core/encode/bits';

describe('pushBits', () => {
  it('appends bits most significant first', () => {
    const bits: number[] = [];
    pushBits(bits, 0b1011, 4);
    expect(bits).toEqual([1, 0, 1, 1]);
    pushBits(bits, 0, 3);
    expect(bits).toEqual([1, 0, 1, 1, 0, 0, 0]);
  });

  it('zero count appends nothing', () => {
    const bits: number[] = [];
    pushBits(bits, 0, 0);
    expect(bits).toEqual([]);
    expect(() => pushBits(bits, 1, 0)).toThrow(RangeError);
  });

  it('rejects values that do not fit', () => {
    expect(() => pushBits([], 16, 4)).toThrow(RangeError);
    expect(() => pushBits([], -1, 4)).toThrow(RangeError);
    expect(() => pushBits([], 1.5, 4)).toThrow(RangeError);
  });

  it('rejects invalid counts', () => {
    expect(() => pushBits([], 0, -1)).toThrow(RangeError);
    expect(() => pushBits([], 0, 32)).toThrow(RangeError);
    expect(() => pushBits([], 0, 2.5)).toThrow(RangeError);
  });

  it('accepts the maximum value for the width', () => {
    const bits: number[] = [];
    pushBits(bits, 15, 4);
    expect(bits).toEqual([1, 1, 1, 1]);
    const wide: number[] = [];
    pushBits(wide, 0x7fffffff, 31);
    expect(wide).toHaveLength(31);
    expect(wide.every((b) => b === 1)).toBe(true);
  });
});

describe('packBits', () => {
  it('packs full bytes MSB first', () => {
    expect(packBits([0, 1, 0, 0, 0, 0, 0, 1])).toEqual([0x41]);
    expect(packBits([1, 1, 1, 1, 1, 1, 1, 1])).toEqual([0xff]);
    expect(packBits([0, 0, 0, 0, 0, 0, 0, 0])).toEqual([0x00]);
  });

  it('pads an incomplete tail with zero bits', () => {
    expect(packBits([1, 0, 1])).toEqual([0xa0]); // 101 00000
    expect(packBits([1, 1, 1, 1, 1, 1, 1])).toEqual([0xfe]);
  });

  it('packs multiple bytes', () => {
    expect(packBits([0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0])).toEqual([1, 2]);
  });

  it('returns empty array for empty input', () => {
    expect(packBits([])).toEqual([]);
  });

  it('rejects invalid bit values', () => {
    expect(() => packBits([0, 2, 1])).toThrow(RangeError);
    expect(() => packBits([0, -1])).toThrow(RangeError);
  });
});

describe('addTerminator', () => {
  it('adds 4 zero bits when there is room', () => {
    const bits = [1, 0, 1, 0];
    addTerminator(bits, 100);
    expect(bits).toEqual([1, 0, 1, 0, 0, 0, 0, 0]);
  });

  it('clamps to the remaining capacity', () => {
    const bits = [1, 1, 1];
    addTerminator(bits, 5);
    expect(bits).toEqual([1, 1, 1, 0, 0]);
  });

  it('adds nothing when exactly at capacity', () => {
    const bits = [1, 0];
    addTerminator(bits, 2);
    expect(bits).toEqual([1, 0]);
  });

  it('throws when the stream already exceeds capacity', () => {
    expect(() => addTerminator([1, 2, 3, 4, 5], 4)).toThrow(RangeError);
  });
});

describe('addPadding', () => {
  it('fills with alternating 0xEC, 0x11 codewords', () => {
    const bytes = [0x01];
    addPadding(bytes, 5);
    expect(bytes).toEqual([0x01, 0xec, 0x11, 0xec, 0x11]);
  });

  it('does nothing when already at capacity', () => {
    const bytes = [1, 2, 3];
    addPadding(bytes, 3);
    expect(bytes).toEqual([1, 2, 3]);
  });

  it('does nothing when beyond capacity', () => {
    const bytes = [1, 2, 3];
    addPadding(bytes, 2);
    expect(bytes).toEqual([1, 2, 3]);
  });

  it('starts the pattern at 0xEC for an empty array', () => {
    const bytes: number[] = [];
    addPadding(bytes, 4);
    expect(bytes).toEqual([0xec, 0x11, 0xec, 0x11]);
  });
});
