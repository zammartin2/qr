/**
 * Numeric mode encoding (ISO/IEC 18004, section 8.4.2).
 *
 * @packageDocumentation
 */

import { MODE_BITS } from '../constants';
import { pushBits } from './bits';
import { charCountBits } from './mode';

const NUMERIC_RE = /^[0-9]+$/;

/**
 * Builds the complete numeric mode segment: mode indicator, character count
 * indicator, and payload.
 *
 * Digits are grouped into runs of 3 (10 bits), a trailing pair (7 bits),
 * or a trailing single digit (4 bits).
 *
 * @param text - Decimal digit string (`[0-9]+`)
 * @param version - QR version (1-40), selects the character count width
 * @returns Segment bits
 * @throws {RangeError} If `text` contains non-digits or `version` is invalid
 */
export function encodeNumeric(text: string, version: number): number[] {
  if (!NUMERIC_RE.test(text)) {
    throw new RangeError(`encodeNumeric: "${text}" is not a numeric string`);
  }
  const bits: number[] = [];
  pushBits(bits, MODE_BITS.numeric, 4);
  pushBits(bits, text.length, charCountBits('numeric', version));

  for (let i = 0; i < text.length; i += 3) {
    const group = text.slice(i, i + 3);
    if (group.length === 3) pushBits(bits, Number(group), 10);
    else if (group.length === 2) pushBits(bits, Number(group), 7);
    else pushBits(bits, Number(group), 4);
  }
  return bits;
}

/**
 * Returns the payload bit length for `count` digits (without segment header).
 *
 * @param count - Number of digits
 * @returns Payload length in bits
 */
export function numericPayloadBits(count: number): number {
  const full = Math.floor(count / 3);
  const rest = count % 3;
  return full * 10 + (rest === 0 ? 0 : rest === 1 ? 4 : 7);
}
