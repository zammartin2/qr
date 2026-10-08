import { describe, expect, it } from 'vitest';
import ModeRef from 'qrcode/lib/core/mode.js';
import BitBufferRef from 'qrcode/lib/core/bit-buffer.js';
import AlphanumericDataRef from 'qrcode/lib/core/alphanumeric-data.js';
import { ALPHANUMERIC_CHARS } from '../../src/core/constants';
import {
  alphanumericPayloadBits,
  encodeAlphanumeric,
} from '../../src/core/encode/alphanumeric';

function refSegment(data: string, version: number): string {
  const bb = new BitBufferRef();
  bb.put(ModeRef.ALPHANUMERIC.bit, 4);
  const group = version <= 9 ? 0 : version <= 26 ? 1 : 2;
  bb.put(data.length, ModeRef.ALPHANUMERIC.ccBits[group]);
  new AlphanumericDataRef(data).write(bb);
  let s = '';
  for (let i = 0; i < bb.length; i++) s += bb.get(i) ? '1' : '0';
  return s;
}

function toBitString(bits: number[]): string {
  return bits.join('');
}

describe('encodeAlphanumeric', () => {
  it('matches the ISO worked example for HELLO WORLD', () => {
    expect(toBitString(encodeAlphanumeric('HELLO WORLD', 1))).toBe(
      '00100000010110110000101101111000110100010111001011011100010011010100001101',
    );
  });

  it('encodes pairs as 45*a + b (11 bits) and singles as 6 bits', () => {
    const bits = (t: string) => toBitString(encodeAlphanumeric(t, 1));
    // 'HE': H=17, E=14 -> 17*45+14 = 779 -> 01100001011
    expect(bits('HE').slice(4 + 9)).toBe('01100001011');
    // 'A' single: index 10 -> 001010
    expect(bits('A').slice(4 + 9)).toBe('001010');
    // 'AB' -> 10*45+11 = 461 -> 00111001101
    expect(bits('AB').slice(4 + 9)).toBe('00111001101');
  });

  it('matches the qrcode reference on assorted strings', () => {
    const inputs = [
      'A',
      'AB',
      'ABC',
      'HELLO WORLD',
      'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG 0123456789',
      '0123456789',
      ' $%*+-./:',
      'A'.repeat(200),
    ];
    for (const data of inputs) {
      for (const version of [1, 9, 10, 26, 27, 40]) {
        expect(toBitString(encodeAlphanumeric(data, version)), `${data.slice(0, 10)} v${version}`)
          .toBe(refSegment(data, version));
      }
    }
  });

  it('covers the full 45-character set', () => {
    expect(ALPHANUMERIC_CHARS).toHaveLength(45);
    expect(() => encodeAlphanumeric(ALPHANUMERIC_CHARS, 1)).not.toThrow();
    // Every single character encodes.
    for (const ch of ALPHANUMERIC_CHARS) {
      expect(() => encodeAlphanumeric(ch, 1)).not.toThrow();
    }
  });

  it('rejects characters outside the alphanumeric set', () => {
    expect(() => encodeAlphanumeric('hello', 1)).toThrow(RangeError);
    expect(() => encodeAlphanumeric('A!', 1)).toThrow(RangeError);
    expect(() => encodeAlphanumeric('Я', 1)).toThrow(RangeError);
  });
});

describe('alphanumericPayloadBits', () => {
  it('computes pair/single payload sizes', () => {
    expect(alphanumericPayloadBits(0)).toBe(0);
    expect(alphanumericPayloadBits(1)).toBe(6);
    expect(alphanumericPayloadBits(2)).toBe(11);
    expect(alphanumericPayloadBits(3)).toBe(17);
    expect(alphanumericPayloadBits(4)).toBe(22);
    expect(alphanumericPayloadBits(45)).toBe(248); // 22 pairs * 11 + single * 6
  });
});
