/**
 * Alphanumeric mode encoding (ISO/IEC 18004, section 8.4.3).
 *
 * @packageDocumentation
 */

import { ALPHANUMERIC_CHARS, MODE_BITS } from '../constants';
import { pushBits } from './bits';
import { charCountBits } from './mode';

/**
 * Builds the complete alphanumeric mode segment: mode indicator, character
 * count indicator, and payload.
 *
 * Character pairs encode as `45 * first + second` in 11 bits; a trailing
 * single character encodes in 6 bits.
 *
 * @param text - String of characters from {@link ALPHANUMERIC_CHARS}
 * @param version - QR version (1-40), selects the character count width
 * @returns Segment bits
 * @throws {RangeError} If `text` contains characters outside the alphanumeric
 *   set or `version` is invalid
 */
export function encodeAlphanumeric(text: string, version: number): number[] {
  for (const ch of text) {
    if (!ALPHANUMERIC_CHARS.includes(ch)) {
      throw new RangeError(`encodeAlphanumeric: character "${ch}" is not alphanumeric`);
    }
  }
  const bits: number[] = [];
  pushBits(bits, MODE_BITS.alphanumeric, 4);
  pushBits(bits, text.length, charCountBits('alphanumeric', version));

  for (let i = 0; i + 1 < text.length; i += 2) {
    const a = ALPHANUMERIC_CHARS.indexOf(text[i]!);
    const b = ALPHANUMERIC_CHARS.indexOf(text[i + 1]!);
    pushBits(bits, a * 45 + b, 11);
  }
  if (text.length % 2 === 1) {
    pushBits(bits, ALPHANUMERIC_CHARS.indexOf(text[text.length - 1]!), 6);
  }
  return bits;
}

/**
 * Returns the payload bit length for `count` alphanumeric characters
 * (without segment header).
 *
 * @param count - Number of characters
 * @returns Payload length in bits
 */
export function alphanumericPayloadBits(count: number): number {
  return Math.floor(count / 2) * 11 + (count % 2 === 1 ? 6 : 0);
}
