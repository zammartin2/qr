import { describe, expect, it } from 'vitest';
import { countChars, encodeData, encodeSegment } from '../../src/core/encode/index';
import type { Mode } from '../../src/core/types';

describe('encodeSegment', () => {
  it('dispatches to the right encoder', () => {
    expect(encodeSegment('123', 'numeric', 1).slice(0, 4)).toEqual([0, 0, 0, 1]);
    expect(encodeSegment('AB', 'alphanumeric', 1).slice(0, 4)).toEqual([0, 0, 1, 0]);
    expect(encodeSegment('a', 'byte', 1).slice(0, 4)).toEqual([0, 1, 0, 0]);
    expect(encodeSegment('あ', 'kanji', 1).slice(0, 4)).toEqual([1, 0, 0, 0]);
  });

  it('rejects unknown modes', () => {
    expect(() => encodeSegment('x', 'emoji' as Mode, 1)).toThrow(RangeError);
  });

  it('propagates mode-specific validation errors', () => {
    expect(() => encodeSegment('abc', 'numeric', 1)).toThrow(RangeError);
    expect(() => encodeSegment('abc', 'alphanumeric', 1)).toThrow(RangeError);
    expect(() => encodeSegment('🙂', 'kanji', 1)).toThrow(RangeError);
  });
});

describe('countChars', () => {
  it('counts per mode semantics', () => {
    expect(countChars('12345', 'numeric')).toBe(5);
    expect(countChars('HELLO', 'alphanumeric')).toBe(5);
    expect(countChars('Фабрициус', 'byte')).toBe(18); // UTF-8 bytes
    expect(countChars('あ🙂', 'kanji')).toBe(2); // code points
    expect(countChars('', 'byte')).toBe(0);
  });

  it('rejects unknown modes', () => {
    expect(() => countChars('x', 'emoji' as Mode)).toThrow(RangeError);
  });
});

describe('encodeData', () => {
  it('produces exactly dataCodewords bytes with alternating padding', () => {
    const bytes = encodeData('hi', 'byte', 1, 'M');
    expect(bytes).toHaveLength(16); // v1-M data codewords
    // 'hi' segment = 4 + 8 + 16 = 28 bits -> terminator 4 -> 32 bits = 4 bytes,
    // then padding starts with 0xEC.
    expect(bytes[4]).toBe(0xec);
    expect(bytes[5]).toBe(0x11);
    expect(bytes[6]).toBe(0xec);
    expect(bytes[7]).toBe(0x11);
    // Last pad codeword: index 15 = 12th pad position -> odd -> 0x11.
    expect(bytes[15]).toBe(0x11);
  });

  it('fills to capacity when the payload almost exactly fills it', () => {
    // v1-L holds 19 codewords; 17 bytes of payload + header fits exactly-ish.
    const bytes = encodeData('A'.repeat(17), 'byte', 1, 'L');
    expect(bytes).toHaveLength(19);
  });

  it('throws when the segment exceeds capacity', () => {
    expect(() => encodeData('A'.repeat(30), 'byte', 1, 'L')).toThrow(/data too long/);
    expect(() => encodeData('A'.repeat(30), 'byte', 1, 'H')).toThrow(RangeError);
  });
});
