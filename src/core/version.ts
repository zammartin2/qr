/**
 * Version selection and capacity calculation (ISO/IEC 18004, section 7.4).
 *
 * @packageDocumentation
 */

import { CHAR_COUNT_BITS, VERSION_GEN } from './constants';
import { getDataCodewords } from './ec-blocks';
import { alphanumericPayloadBits } from './encode/alphanumeric';
import { bytePayloadBits } from './encode/byte';
import { kanjiPayloadBits } from './encode/kanji';
import { numericPayloadBits } from './encode/numeric';
import type { ECLevel, Mode } from './types';

/**
 * Returns the symbol side length in modules for a version.
 *
 * @param version - QR version (1-40)
 * @returns `4 * version + 17`
 * @throws {RangeError} If version is outside 1-40
 */
export function symbolSize(version: number): number {
  if (!Number.isInteger(version) || version < 1 || version > 40) {
    throw new RangeError(`symbolSize: version must be 1-40, got ${version}`);
  }
  return version * 4 + 17;
}

/**
 * Returns the payload bit length (excluding mode and character count
 * indicators) for a number of characters in `mode`.
 *
 * @param mode - Encoding mode
 * @param count - Number of characters (digits / chars / bytes / kanji chars)
 * @returns Payload length in bits
 * @throws {RangeError} If the mode is unknown or `count` is negative
 */
export function payloadBits(mode: Mode, count: number): number {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`payloadBits: count must be a non-negative integer, got ${count}`);
  }
  switch (mode) {
    case 'numeric':
      return numericPayloadBits(count);
    case 'alphanumeric':
      return alphanumericPayloadBits(count);
    case 'byte':
      return bytePayloadBits(count);
    case 'kanji':
      return kanjiPayloadBits(count);
    default:
      throw new RangeError(`payloadBits: unknown mode "${mode}"`);
  }
}

/**
 * Returns the total number of bits required for a complete segment
 * (mode indicator + character count + payload) at a given version.
 *
 * @param mode - Encoding mode
 * @param count - Number of characters
 * @param version - QR version (1-40)
 * @returns Required bits
 * @throws {RangeError} If inputs are invalid
 */
export function requiredBits(mode: Mode, count: number, version: number): number {
  const countBits = CHAR_COUNT_BITS[mode];
  if (!countBits) {
    throw new RangeError(`requiredBits: unknown mode "${mode}"`);
  }
  if (!Number.isInteger(version) || version < 1 || version > 40) {
    throw new RangeError(`requiredBits: version must be 1-40, got ${version}`);
  }
  const group = version <= 9 ? 0 : version <= 26 ? 1 : 2;
  return 4 + countBits[group]! + payloadBits(mode, count);
}

/**
 * Selects the minimal QR version that fits the payload.
 *
 * @param params - Selection parameters
 * @param params.mode - Encoding mode
 * @param params.count - Number of characters
 * @param params.ecLevel - Error correction level
 * @param [params.minVersion=1] - Lower version bound
 * @param [params.maxVersion=40] - Upper version bound
 * @returns Chosen version (1-40)
 * @throws {RangeError} If the range is invalid or no version can fit the data
 */
export function chooseVersion(params: {
  mode: Mode;
  count: number;
  ecLevel: ECLevel;
  minVersion?: number;
  maxVersion?: number;
}): number {
  const { mode, count, ecLevel } = params;
  const minVersion = params.minVersion ?? 1;
  const maxVersion = params.maxVersion ?? 40;

  if (
    !Number.isInteger(minVersion) ||
    !Number.isInteger(maxVersion) ||
    minVersion < 1 ||
    maxVersion > 40 ||
    minVersion > maxVersion
  ) {
    throw new RangeError(
      `chooseVersion: invalid version range ${minVersion}..${maxVersion} (expected 1-40, min <= max)`,
    );
  }

  for (let v = minVersion; v <= maxVersion; v++) {
    const capacity = getDataCodewords(v, ecLevel) * 8;
    if (requiredBits(mode, count, v) <= capacity) return v;
  }
  const need = requiredBits(mode, count, maxVersion);
  throw new RangeError(
    `data too long for QR (maxVersion ${maxVersion}, ec ${ecLevel}): ` +
      `need ${need}+ bits, have ${getDataCodewords(maxVersion, ecLevel) * 8}`,
  );
}

/** Bit length of the version BCH generator polynomial. */
const VERSION_GEN_LEN = 13; // VERSION_GEN = 0b1111100100101

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
 * Encodes the 18-bit version information for versions 7-40
 * (BCH(18, 6) with generator `0b1111100100101`).
 *
 * @param version - QR version (7-40)
 * @returns 18-bit version information value
 * @throws {RangeError} If the version is outside 7-40
 */
export function generateVersionInfo(version: number): number {
  if (!Number.isInteger(version) || version < 7 || version > 40) {
    throw new RangeError(`generateVersionInfo: version must be 7-40, got ${version}`);
  }
  let d = version << 12;
  while (bitLength(d) >= VERSION_GEN_LEN) {
    d ^= VERSION_GEN << (bitLength(d) - VERSION_GEN_LEN);
  }
  return (version << 12) | d;
}

/**
 * Writes the 18 version information bits into both 3x6 blocks of the matrix
 * (top-right and bottom-left) and marks them reserved.
 *
 * Bit placement (bit 0 = LSB), matching ISO/IEC 18004 figure 22:
 * for `i = 0..17` the bit goes to (`i / 3`, `size - 11 + i % 3`) and, mirrored,
 * to (`size - 11 + i % 3`, `i / 3`).
 *
 * @param matrix - Module matrix (`0`/`1`), mutated in place
 * @param reserved - Reservation map, marked `true` for the written cells
 * @param version - QR version (7-40)
 * @throws {RangeError} If the version is outside 7-40
 */
export function placeVersionInfo(
  matrix: number[][],
  reserved: boolean[][],
  version: number,
): void {
  const size = matrix.length;
  const bits = generateVersionInfo(version);
  for (let i = 0; i < 18; i++) {
    const row = Math.floor(i / 3);
    const col = (i % 3) + size - 11;
    const mod = (bits >>> i) & 1;
    matrix[row]![col] = mod;
    reserved[row]![col] = true;
    matrix[col]![row] = mod;
    reserved[col]![row] = true;
  }
}
