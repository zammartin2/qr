/**
 * Byte mode encoding (ISO/IEC 18004, section 8.4.4).
 *
 * @packageDocumentation
 */

import { MODE_BITS } from '../constants';
import { pushBits } from './bits';
import { charCountBits } from './mode';

/** Shared UTF-8 encoder (global, no dependency). */
const utf8 = new TextEncoder();

/**
 * Builds the complete byte mode segment: mode indicator, character count
 * indicator, and payload.
 *
 * The character count is the number of **UTF-8 bytes**, not code points.
 *
 * @param text - Text to encode (UTF-8)
 * @param version - QR version (1-40), selects the character count width
 * @returns Segment bits
 * @throws {RangeError} If `version` is invalid
 */
export function encodeByte(text: string, version: number): number[] {
  const bytes = utf8.encode(text);
  const bits: number[] = [];
  pushBits(bits, MODE_BITS.byte, 4);
  pushBits(bits, bytes.length, charCountBits('byte', version));
  for (const byte of bytes) {
    pushBits(bits, byte, 8);
  }
  return bits;
}

/**
 * Returns the UTF-8 byte length of `text`.
 *
 * @param text - Text to measure
 * @returns Number of UTF-8 bytes
 */
export function byteLength(text: string): number {
  return utf8.encode(text).length;
}

/**
 * Returns the payload bit length for `byteCount` bytes (without segment
 * header).
 *
 * @param byteCount - Number of UTF-8 bytes
 * @returns Payload length in bits
 */
export function bytePayloadBits(byteCount: number): number {
  return byteCount * 8;
}
