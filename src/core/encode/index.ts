/**
 * Full data stream assembly: segment + terminator + padding
 * (ISO/IEC 18004, section 8.4).
 *
 * @packageDocumentation
 */

import type { ECLevel, Mode } from '../types';
import { getDataCodewords } from '../ec-blocks';
import { addPadding, addTerminator, packBits } from './bits';
import { encodeAlphanumeric } from './alphanumeric';
import { byteLength, encodeByte } from './byte';
import { encodeKanji } from './kanji';
import { encodeNumeric } from './numeric';

/**
 * Builds the complete segment (mode indicator + character count + payload)
 * for `text`.
 *
 * @param text - Text to encode
 * @param mode - Encoding mode (must accept `text`)
 * @param version - QR version (1-40)
 * @returns Segment bits
 * @throws {RangeError} If `text` is invalid for `mode` or `version` is invalid
 */
export function encodeSegment(text: string, mode: Mode, version: number): number[] {
  switch (mode) {
    case 'numeric':
      return encodeNumeric(text, version);
    case 'alphanumeric':
      return encodeAlphanumeric(text, version);
    case 'byte':
      return encodeByte(text, version);
    case 'kanji':
      return encodeKanji(text, version);
    default:
      throw new RangeError(`encodeSegment: unknown mode "${mode}"`);
  }
}

/**
 * Encodes `text` into the final data codeword sequence for a version and
 * error correction level: segment, clamped terminator, byte alignment, and
 * alternating `0xEC`/`0x11` pad codewords.
 *
 * @param text - Text to encode
 * @param mode - Encoding mode
 * @param version - QR version (1-40)
 * @param ecLevel - Error correction level (determines capacity)
 * @returns Data codewords (exactly `getDataCodewords(version, ecLevel)` long)
 * @throws {RangeError} If the segment does not fit the capacity or inputs are
 *   invalid
 */
export function encodeData(
  text: string,
  mode: Mode,
  version: number,
  ecLevel: ECLevel,
): number[] {
  const dataCodewords = getDataCodewords(version, ecLevel);
  const capacityBits = dataCodewords * 8;

  const segment = encodeSegment(text, mode, version);
  if (segment.length > capacityBits) {
    throw new RangeError(
      `data too long for version ${version} ec ${ecLevel}: ` +
        `segment needs ${segment.length} bits, capacity ${capacityBits}`,
    );
  }

  addTerminator(segment, capacityBits);
  while (segment.length % 8 !== 0) segment.push(0);

  const bytes = packBits(segment);
  addPadding(bytes, dataCodewords);
  return bytes;
}

/**
 * Returns the character count used by the character count indicator for
 * `text` in `mode`.
 *
 * - `numeric` / `alphanumeric`: number of characters
 * - `byte`: number of UTF-8 bytes
 * - `kanji`: number of code points
 *
 * @param text - Text to measure
 * @param mode - Encoding mode
 * @returns Character count for the mode
 * @throws {RangeError} If the mode is unknown
 */
export function countChars(text: string, mode: Mode): number {
  switch (mode) {
    case 'numeric':
    case 'alphanumeric':
      return text.length;
    case 'byte':
      return byteLength(text);
    case 'kanji':
      return [...text].length;
    default:
      throw new RangeError(`countChars: unknown mode "${mode}"`);
  }
}
