import { describe, expect, it } from 'vitest';
import { KANJI_TABLE, KANJI_TABLE_SIZE } from '../../src/core/encode/kanji-table';
import {
  encodeKanji,
  kanjiPayloadBits,
  kanjiValue,
  lookupSJIS,
} from '../../src/core/encode/kanji';

const decoder = new TextDecoder('shift_jis');

describe('lookupSJIS / table integrity', () => {
  it('maps known characters to known Shift JIS codes', () => {
    expect(lookupSJIS(0x3042)).toBe(0x82a0); // あ
    expect(lookupSJIS(0x6f22)).toBe(0x8abf); // 漢
  });

  it('returns undefined for unmappable characters', () => {
    expect(lookupSJIS(0x1f642)).toBeUndefined(); // 🙂
    expect(lookupSJIS(0x0041)).toBeUndefined(); // 'A' (ASCII is not double-byte SJIS)
    expect(lookupSJIS(0x1f600)).toBeUndefined();
  });

  it('every table entry round-trips through TextDecoder', () => {
    const table = KANJI_TABLE;
    expect(KANJI_TABLE_SIZE).toBeGreaterThan(6000);
    expect(table).toHaveLength(KANJI_TABLE_SIZE * 2);

    let prevCp = -1;
    for (let i = 0; i < KANJI_TABLE_SIZE; i++) {
      const cp = table[i * 2]!;
      const sjis = table[i * 2 + 1]!;

      // Sorted strictly ascending (binary search invariant).
      expect(cp).toBeGreaterThan(prevCp);
      prevCp = cp;

      // Inside one of the two kanji-mode ranges.
      const inRange =
        (sjis >= 0x8140 && sjis <= 0x9ffc) || (sjis >= 0xe040 && sjis <= 0xebbf);
      expect(inRange, `sjis 0x${sjis.toString(16)}`).toBe(true);

      // Decoder agreement: SJIS bytes decode back to this code point.
      const decoded = decoder.decode(Uint8Array.from([(sjis >> 8) & 0xff, sjis & 0xff]));
      expect([...decoded][0], `sjis 0x${sjis.toString(16)}`).toBe(String.fromCodePoint(cp));

      // Our lookup finds exactly this code.
      expect(lookupSJIS(cp)).toBe(sjis);
    }
  });

  it('covers hiragana, katakana, kanji, and Cyrillic', () => {
    expect(lookupSJIS(0x3042)).toBeDefined(); // あ (hiragana)
    expect(lookupSJIS(0x30a2)).toBeDefined(); // ア (katakana)
    expect(lookupSJIS(0x6f22)).toBeDefined(); // 漢 (CJK)
    const table = KANJI_TABLE;
    let cyrillic = 0;
    for (let i = 0; i < KANJI_TABLE_SIZE; i++) {
      const cp = table[i * 2]!;
      if (cp >= 0x0400 && cp <= 0x04ff) cyrillic++;
    }
    expect(cyrillic).toBeGreaterThan(0); // JIS X 0208 Cyrillic rows are present
  });
});

describe('kanjiValue', () => {
  it('encodes あ (SJIS 0x82A0) as 288 -> 0000100100000', () => {
    expect(lookupSJIS(0x3042)).toBe(0x82a0);
    expect(kanjiValue(0x3042)).toBe(288);
    expect(kanjiValue(0x3042).toString(2).padStart(13, '0')).toBe('0000100100000');
  });

  it('applies the correct range offset per half of the standard', () => {
    // Range 1 (0x8140-0x9FFC): subtract 0x8140.
    const cpLow = 0x6f22; // 漢 -> SJIS 0x8ABF
    const sjisLow = lookupSJIS(cpLow)!;
    expect(sjisLow).toBeGreaterThanOrEqual(0x8140);
    expect(sjisLow).toBeLessThanOrEqual(0x9ffc);
    const v1 = sjisLow - 0x8140;
    expect(kanjiValue(cpLow)).toBe(((v1 >> 8) & 0xff) * 0xc0 + (v1 & 0xff));

    // Range 2 (0xE040-0xEBBF): subtract 0xC140.
    const table = KANJI_TABLE;
    const high: [number, number][] = [];
    for (let i = 0; i < KANJI_TABLE_SIZE; i++) {
      const sjis = table[i * 2 + 1]!;
      if (sjis >= 0xe040 && sjis <= 0xebbf) {
        high.push([table[i * 2]!, sjis]);
        if (high.length >= 50) break;
      }
    }
    expect(high.length).toBeGreaterThan(0);
    for (const [cp, sjis] of high) {
      const v2 = sjis - 0xc140;
      expect(kanjiValue(cp)).toBe(((v2 >> 8) & 0xff) * 0xc0 + (v2 & 0xff));
    }
  });

  it('throws a descriptive error for unmappable characters', () => {
    expect(() => kanjiValue(0x1f642)).toThrow(/U\+1F642/);
    expect(() => kanjiValue(0x1f642)).toThrow(/Kanji mode/);
    expect(() => kanjiValue(0x0041)).toThrow(RangeError);
  });
});

describe('encodeKanji', () => {
  it('builds mode + count + 13-bit payload', () => {
    const bits = encodeKanji('あ', 1);
    // mode 1000, count 1 (8 bits), value 288 (13 bits)
    expect(bits.slice(0, 4)).toEqual([1, 0, 0, 0]);
    expect(bits.slice(4, 12).join('')).toBe('00000001');
    expect(bits.slice(12).join('')).toBe('0000100100000');
    expect(bits).toHaveLength(4 + 8 + 13);
  });

  it('uses the version group for the character count', () => {
    expect(encodeKanji('あ', 9)).toHaveLength(4 + 8 + 13);
    expect(encodeKanji('あ', 10)).toHaveLength(4 + 10 + 13);
    expect(encodeKanji('あ', 26)).toHaveLength(4 + 10 + 13);
    expect(encodeKanji('あ', 27)).toHaveLength(4 + 12 + 13);
    expect(encodeKanji('あ', 40)).toHaveLength(4 + 12 + 13);
  });

  it('encodes multi-character strings', () => {
    const bits = encodeKanji('あい', 1);
    expect(bits).toHaveLength(4 + 8 + 13 * 2);
    expect(bits.slice(12, 25).join('')).toBe('0000100100000'); // あ
    expect(bits.slice(25).join('')).toBe(encodeKanji('い', 1).slice(12).join(''));
  });

  it('handles empty text (count 0)', () => {
    expect(encodeKanji('', 1)).toHaveLength(4 + 8);
  });

  it('throws when any character is not in Shift JIS', () => {
    expect(() => encodeKanji('あ🙂', 1)).toThrow(/U\+1F642/);
    expect(() => encodeKanji('hello', 1)).toThrow(/Kanji mode/);
  });

  it('rejects invalid versions', () => {
    expect(() => encodeKanji('あ', 0)).toThrow(RangeError);
    expect(() => encodeKanji('あ', 41)).toThrow(RangeError);
  });
});

describe('kanjiPayloadBits', () => {
  it('13 bits per character', () => {
    expect(kanjiPayloadBits(0)).toBe(0);
    expect(kanjiPayloadBits(1)).toBe(13);
    expect(kanjiPayloadBits(10)).toBe(130);
  });
});
