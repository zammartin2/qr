import { describe, expect, it } from 'vitest';
import ModeRef from 'qrcode/lib/core/mode.js';
import BitBufferRef from 'qrcode/lib/core/bit-buffer.js';
import NumericDataRef from 'qrcode/lib/core/numeric-data.js';
import { encodeNumeric, numericPayloadBits } from '../../src/core/encode/numeric';

function refSegment(data: string, version: number): boolean[] {
  const bb = new BitBufferRef();
  bb.put(ModeRef.NUMERIC.bit, 4);
  const group = version <= 9 ? 0 : version <= 26 ? 1 : 2;
  bb.put(data.length, ModeRef.NUMERIC.ccBits[group]);
  new NumericDataRef(data).write(bb);
  const bits: boolean[] = [];
  for (let i = 0; i < bb.length; i++) bits.push(bb.get(i));
  return bits;
}

function toBitString(bits: number[]): string {
  return bits.join('');
}

/** Strips the 4-bit mode indicator and 10-bit v1 character count. */
function payload(bits: number[]): number[] {
  return bits.slice(4 + 10);
}

describe('encodeNumeric', () => {
  it('matches the ISO worked example for 01234567', () => {
    // mode 0001 | count 0000001000 | 012 -> 0000001100 | 345 -> 0001011001 | 67 -> 1000011
    expect(toBitString(encodeNumeric('01234567', 1))).toBe(
      '00010000001000000000110001010110011000011',
    );
  });

  it('matches the qrcode reference for random digit strings', () => {
    const inputs = [
      '0',
      '12',
      '123',
      '1234',
      '1234567890',
      '000000000000000000000000000000000001',
      '98765432101234567890',
      '1'.repeat(500),
    ];
    for (const data of inputs) {
      for (const version of [1, 9, 10, 26, 27, 40]) {
        const ours = encodeNumeric(data, version);
        expect(toBitString(ours), `${data.slice(0, 10)}... v${version}`).toBe(
          refSegment(data, version).map((b) => (b ? '1' : '0')).join(''),
        );
      }
    }
  });

  it('uses 10/7/4-bit groups', () => {
    expect(payload(encodeNumeric('1', 1))).toHaveLength(4);
    expect(payload(encodeNumeric('12', 1))).toHaveLength(7);
    expect(payload(encodeNumeric('123', 1))).toHaveLength(10);
    expect(payload(encodeNumeric('1234', 1))).toHaveLength(14);
    expect(payload(encodeNumeric('12345', 1))).toHaveLength(17);
    expect(payload(encodeNumeric('123456', 1))).toHaveLength(20);
  });

  it('counts leading zeros as characters', () => {
    const bits = encodeNumeric('007', 1);
    // count indicator = 3
    expect(toBitString(bits.slice(4, 14))).toBe('0000000011');
    expect(payload(bits)).toHaveLength(10);
  });

  it('rejects non-numeric input', () => {
    expect(() => encodeNumeric('12a', 1)).toThrow(RangeError);
    expect(() => encodeNumeric('', 1)).toThrow(RangeError);
    expect(() => encodeNumeric('1 2', 1)).toThrow(RangeError);
  });
});

describe('numericPayloadBits', () => {
  it('computes payload sizes for 3-2-1 grouping', () => {
    expect(numericPayloadBits(0)).toBe(0);
    expect(numericPayloadBits(1)).toBe(4);
    expect(numericPayloadBits(2)).toBe(7);
    expect(numericPayloadBits(3)).toBe(10);
    expect(numericPayloadBits(4)).toBe(14);
    expect(numericPayloadBits(5)).toBe(17);
    expect(numericPayloadBits(6)).toBe(20);
    expect(numericPayloadBits(100)).toBe(334); // 33 groups * 10 + 1 digit * 4
  });
});
