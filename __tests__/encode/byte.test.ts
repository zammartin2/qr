import { describe, expect, it } from 'vitest';
import ModeRef from 'qrcode/lib/core/mode.js';
import BitBufferRef from 'qrcode/lib/core/bit-buffer.js';
import ByteDataRef from 'qrcode/lib/core/byte-data.js';
import { byteLength, bytePayloadBits, encodeByte } from '../../src/core/encode/byte';

function refSegment(data: string, version: number): string {
  const seg = new ByteDataRef(data); // converts to UTF-8 bytes internally
  const bb = new BitBufferRef();
  bb.put(ModeRef.BYTE.bit, 4);
  const group = version <= 9 ? 0 : version <= 26 ? 1 : 2;
  bb.put(seg.getLength(), ModeRef.BYTE.ccBits[group]); // count = UTF-8 bytes
  seg.write(bb);
  let s = '';
  for (let i = 0; i < bb.length; i++) s += bb.get(i) ? '1' : '0';
  return s;
}

function toBitString(bits: number[]): string {
  return bits.join('');
}

describe('encodeByte', () => {
  it('matches the exact bit vector for "hello"', () => {
    expect(toBitString(encodeByte('hello', 1))).toBe(
      '0100000001010110100001100101011011000110110001101111',
    );
  });

  it('encodes multi-byte UTF-8 characters', () => {
    const bits = encodeByte('ñ', 1); // U+00F1 -> C3 B1
    // mode 0100, count 00000010, then 11000011 10110001
    expect(toBitString(bits)).toBe('0100000000101100001110110001');
  });

  it('uses byte length (not code points) as the character count', () => {
    // 'Фабрициус': 9 Cyrillic chars = 18 UTF-8 bytes; v1 count width = 8 bits.
    const text = 'Фабрициус';
    const bits = encodeByte(text, 1);
    expect(toBitString(bits.slice(4, 12))).toBe('00010010'); // 18
    expect(byteLength(text)).toBe(18);
  });

  it('encodes astral characters as 4-byte sequences', () => {
    const bits = encodeByte('🙂', 1); // U+1F642 -> F0 9F 99 82
    expect(byteLength('🙂')).toBe(4);
    expect(toBitString(bits)).toBe('010000000100' + '11110000' + '10011111' + '10011001' + '10000010');
  });

  it('handles empty text (count 0, no payload)', () => {
    expect(toBitString(encodeByte('', 1))).toBe('010000000000');
  });

  it('matches the qrcode reference on assorted strings', () => {
    const inputs = [
      'a',
      'hello world',
      'Фабрициус Владимир Николаевич',
      'https://example.com/тест?параметр=значение',
      'emoji 🙂 mixed 日本語',
      'x'.repeat(1000),
      '',
    ];
    for (const data of inputs) {
      // Count widths: 8 bits below v10 (fits < 256 bytes), 16 bits from v10.
      const versions = byteLength(data) < 256 ? [1, 9, 10, 26, 27, 40] : [10, 26, 27, 40];
      for (const version of versions) {
        expect(toBitString(encodeByte(data, version)), `v${version} ${data.slice(0, 10)}`).toBe(
          refSegment(data, version),
        );
      }
    }
  });

  it('rejects invalid versions through char count bits', () => {
    expect(() => encodeByte('a', 0)).toThrow(RangeError);
    expect(() => encodeByte('a', 41)).toThrow(RangeError);
  });
});

describe('byteLength / bytePayloadBits', () => {
  it('computes UTF-8 lengths', () => {
    expect(byteLength('')).toBe(0);
    expect(byteLength('abc')).toBe(3);
    expect(byteLength('ñ')).toBe(2);
    expect(byteLength('あ')).toBe(3);
    expect(byteLength('🙂')).toBe(4);
  });

  it('payload bits = 8 * bytes', () => {
    expect(bytePayloadBits(0)).toBe(0);
    expect(bytePayloadBits(1)).toBe(8);
    expect(bytePayloadBits(17)).toBe(136);
  });
});
