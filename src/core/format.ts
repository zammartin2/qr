/**
 * Format information: BCH(15, 5) encoding and placement
 * (ISO/IEC 18004, section 8.9 and Annex A).
 *
 * @packageDocumentation
 */

import { EC_BITS, FORMAT_GEN, FORMAT_MASK } from './constants';
import type { ECLevel, MaskPattern } from './types';

/** Number of bits in the format information sequence. */
const FORMAT_BITS = 15;

/** Bit length of the BCH generator polynomial. */
const GEN_LEN = 11; // FORMAT_GEN = 0b10100110111

function bitLength(value: number): number {
  let len = 0;
  let v = value;
  while (v !== 0) {
    len++;
    v >>>= 1;
  }
  return len;
}

/**
 * Encodes the 15-bit format information for an EC level and mask.
 *
 * 5 data bits (`EC_BITS << 3 | mask`) + 10 BCH error correction bits,
 * XORed with `0b101010000010010`.
 *
 * @param ecLevel - Error correction level
 * @param mask - Mask pattern (0-7)
 * @returns 15-bit format information value (0-32767)
 * @throws {RangeError} If the EC level or mask is invalid
 */
export function generateFormatInfo(ecLevel: ECLevel, mask: MaskPattern): number {
  const ecBit = EC_BITS[ecLevel];
  if (ecBit === undefined) {
    throw new RangeError(`generateFormatInfo: invalid EC level "${ecLevel}"`);
  }
  if (!Number.isInteger(mask) || mask < 0 || mask > 7) {
    throw new RangeError(`generateFormatInfo: invalid mask pattern ${mask}`);
  }
  const data = (ecBit << 3) | mask;
  let d = data << 10;
  while (bitLength(d) >= GEN_LEN) {
    d ^= FORMAT_GEN << (bitLength(d) - GEN_LEN);
  }
  return ((data << 10) | d) ^ FORMAT_MASK;
}

/**
 * Writes the 15 format information bits into both copies in the matrix and
 * marks those modules reserved.
 *
 * Bit placement (bit 0 = LSB), matching ISO/IEC 18004 figure 25:
 *
 * - Column 8: rows 0-5 get bits 0-5, row 7 gets bit 6, row 8 gets bit 7,
 *   rows `size-7 .. size-1` get bits 8-14.
 * - Row 8: columns `size-1 .. size-8` get bits 0-7, column 7 gets bit 8,
 *   columns 5-0 get bits 9-14 (column 6 is the timing pattern).
 *
 * @param matrix - Module matrix (`0`/`1`), mutated in place
 * @param ecLevel - Error correction level
 * @param mask - Mask pattern (0-7)
 * @throws {RangeError} If inputs are invalid
 */
export function placeFormatInfo(
  matrix: number[][],
  ecLevel: ECLevel,
  mask: MaskPattern,
): void {
  const size = matrix.length;
  const bits = generateFormatInfo(ecLevel, mask);

  for (let i = 0; i < FORMAT_BITS; i++) {
    const mod = (bits >>> i) & 1;

    // Vertical copy (column 8).
    if (i < 6) {
      matrix[i]![8] = mod;
    } else if (i < 8) {
      matrix[i + 1]![8] = mod;
    } else {
      matrix[size - 15 + i]![8] = mod;
    }

    // Horizontal copy (row 8).
    if (i < 8) {
      matrix[8]![size - i - 1] = mod;
    } else if (i < 9) {
      matrix[8]![15 - i - 1 + 1] = mod;
    } else {
      matrix[8]![15 - i - 1] = mod;
    }
  }
}
