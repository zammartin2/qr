/**
 * Bit-level helpers for building QR data streams.
 *
 * @packageDocumentation
 */

import { PAD_BYTES } from '../constants';

/**
 * Appends the low `count` bits of `value`, most significant bit first.
 *
 * @param bits - Bit array to append to (mutated in place)
 * @param value - Non-negative integer to append
 * @param count - Number of bits to append (0-31)
 * @throws {RangeError} If `value` is negative, not an integer, or does not fit
 *   in `count` bits
 */
export function pushBits(bits: number[], value: number, count: number): void {
  if (!Number.isInteger(count) || count < 0 || count > 31) {
    throw new RangeError(`pushBits: count must be 0-31, got ${count}`);
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`pushBits: value must be a non-negative integer, got ${value}`);
  }
  if (count < 31 && value >= 2 ** count) {
    throw new RangeError(`pushBits: value ${value} does not fit in ${count} bits`);
  }
  for (let i = count - 1; i >= 0; i--) {
    bits.push((value >>> i) & 1);
  }
}

/**
 * Packs a bit array into bytes, most significant bit first.
 *
 * If the length is not a multiple of 8, the tail is padded with zero bits.
 *
 * @param bits - Array of 0/1 values
 * @returns Packed bytes
 * @throws {RangeError} If `bits` contains a value other than 0 or 1
 */
export function packBits(bits: readonly number[]): number[] {
  const bytes: number[] = [];
  let acc = 0;
  let filled = 0;
  for (const bit of bits) {
    if (bit !== 0 && bit !== 1) {
      throw new RangeError(`packBits: invalid bit value ${bit}`);
    }
    acc = (acc << 1) | bit;
    filled++;
    if (filled === 8) {
      bytes.push(acc);
      acc = 0;
      filled = 0;
    }
  }
  if (filled > 0) {
    bytes.push(acc << (8 - filled));
  }
  return bytes;
}

/**
 * Appends up to 4 zero terminator bits, clamped to the remaining capacity
 * (ISO/IEC 18004, section 8.4.9).
 *
 * @param bits - Bit array to append to (mutated in place)
 * @param capacity - Total capacity in bits
 * @throws {RangeError} If the array already exceeds `capacity`
 */
export function addTerminator(bits: number[], capacity: number): void {
  if (bits.length > capacity) {
    throw new RangeError(
      `addTerminator: stream of ${bits.length} bits exceeds capacity ${capacity}`,
    );
  }
  const terminator = Math.min(4, capacity - bits.length);
  for (let i = 0; i < terminator; i++) bits.push(0);
}

/**
 * Fills a byte array with alternating pad codewords `0xEC, 0x11, 0xEC, ...`
 * up to `capacity` (ISO/IEC 18004, section 8.4.9).
 *
 * If `bytes` is already at or beyond capacity, nothing is appended.
 *
 * @param bytes - Byte array to pad (mutated in place)
 * @param capacity - Target length in bytes
 */
export function addPadding(bytes: number[], capacity: number): void {
  let i = 0;
  while (bytes.length < capacity) {
    bytes.push(PAD_BYTES[i % PAD_BYTES.length]!);
    i++;
  }
}
