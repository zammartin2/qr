/**
 * Kanji mode encoding (ISO/IEC 18004, section 8.4.5).
 *
 * Characters are mapped to Shift JIS through a generated table
 * (see `scripts/gen-kanji-map.mjs`) and encoded as 13-bit values covering
 * the double-byte ranges 0x8140-0x9FFC and 0xE040-0xEBBF.
 *
 * @packageDocumentation
 */

import { MODE_BITS } from '../constants';
import { pushBits } from './bits';
import { charCountBits } from './mode';
import { KANJI_TABLE, KANJI_TABLE_SIZE } from './kanji-table';

/**
 * Looks up the Shift JIS code for a Unicode code point.
 *
 * @param codePoint - Unicode code point
 * @returns Shift JIS double-byte code, or `undefined` if not representable
 */
export function lookupSJIS(codePoint: number): number | undefined {
  const table = KANJI_TABLE;
  let lo = 0;
  let hi = KANJI_TABLE_SIZE - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cp = table[mid * 2]!;
    if (cp === codePoint) return table[mid * 2 + 1]!;
    if (cp < codePoint) lo = mid + 1;
    else hi = mid - 1;
  }
  return undefined;
}

/**
 * Encodes a single character to its 13-bit kanji mode value.
 *
 * Range adjustment (classic pitfall — the two ranges subtract different
 * offsets): `0x8140-0x9FFC` subtracts `0x8140`, `0xE040-0xEBBF` subtracts
 * `0xC140`; then `value = high * 0xC0 + low`.
 *
 * @param codePoint - Unicode code point
 * @returns 13-bit value (0-8191)
 * @throws {RangeError} If the character is not in Shift JIS
 */
export function kanjiValue(codePoint: number): number {
  const sjis = lookupSJIS(codePoint);
  if (sjis === undefined) {
    const ch = String.fromCodePoint(codePoint);
    throw new RangeError(
      `character U+${codePoint.toString(16).toUpperCase().padStart(4, '0')} ` +
        `"${ch}" cannot be encoded in Kanji mode (not in Shift JIS)`,
    );
  }
  // The generated table only ever contains codes inside these two ranges
  // (asserted for every entry in the kanji test suite).
  let v = sjis;
  if (v >= 0x8140 && v <= 0x9ffc) v -= 0x8140;
  else v -= 0xc140;
  return ((v >> 8) & 0xff) * 0xc0 + (v & 0xff);
}

/**
 * Builds the complete kanji mode segment: mode indicator, character count
 * indicator, and payload.
 *
 * @param text - Text where every character must exist in Shift JIS
 * @param version - QR version (1-40), selects the character count width
 * @returns Segment bits
 * @throws {RangeError} If a character is not encodable or `version` is invalid
 */
export function encodeKanji(text: string, version: number): number[] {
  const bits: number[] = [];
  const codePoints = [...text];
  pushBits(bits, MODE_BITS.kanji, 4);
  pushBits(bits, codePoints.length, charCountBits('kanji', version));
  for (const ch of codePoints) {
    pushBits(bits, kanjiValue(ch.codePointAt(0)!), 13);
  }
  return bits;
}

/**
 * Returns the payload bit length for `count` kanji characters
 * (without segment header).
 *
 * @param count - Number of characters
 * @returns Payload length in bits
 */
export function kanjiPayloadBits(count: number): number {
  return count * 13;
}
