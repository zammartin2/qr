import type { ECLevel, MaskPattern, Mode } from './types';

/** Mode indicator bit patterns (ISO/IEC 18004, Table 2). */
export const MODE_BITS: Record<Mode, number> = {
  numeric: 0b0001,
  alphanumeric: 0b0010,
  byte: 0b0100,
  kanji: 0b1000,
};

/** Error correction level indicator bits (ISO/IEC 18004, Annex A). */
export const EC_BITS: Record<ECLevel, number> = {
  L: 0b01,
  M: 0b00,
  Q: 0b11,
  H: 0b10,
};

/** ISO/IEC 646 subset used by alphanumeric mode (45 characters). */
export const ALPHANUMERIC_CHARS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

/** Alternating pad codewords appended after the terminator (ISO/IEC 18004). */
export const PAD_BYTES = [0xec, 0x11];

/** Generator polynomial for format information BCH(15, 5). */
export const FORMAT_GEN = 0b10100110111;

/** XOR mask applied to format information bits. */
export const FORMAT_MASK = 0b101010000010010;

/** Generator polynomial for version information BCH(18, 6). */
export const VERSION_GEN = 0b1111100100101;

/** Character count indicator widths per mode and version group (1-9, 10-26, 27-40). */
export const CHAR_COUNT_BITS: Record<Mode, [number, number, number]> = {
  numeric: [10, 12, 14],
  alphanumeric: [9, 11, 13],
  byte: [8, 16, 16],
  kanji: [8, 10, 12],
};

/** Unused remainder bits per version range (ISO/IEC 18004, Table 1). */
export const REMAINDER_BITS: Record<number, number> = {
  1: 0,
  // 2-6
  2: 7,
  3: 7,
  4: 7,
  5: 7,
  6: 7,
  // 7-13
  7: 0,
  8: 0,
  9: 0,
  10: 0,
  11: 0,
  12: 0,
  13: 0,
  // 14-20
  14: 3,
  15: 3,
  16: 3,
  17: 3,
  18: 3,
  19: 3,
  20: 3,
  // 21-27
  21: 4,
  22: 4,
  23: 4,
  24: 4,
  25: 4,
  26: 4,
  27: 4,
  // 28-34
  28: 3,
  29: 3,
  30: 3,
  31: 3,
  32: 3,
  33: 3,
  34: 3,
  // 35-40
  35: 0,
  36: 0,
  37: 0,
  38: 0,
  39: 0,
  40: 0,
};

/** Minimum supported version. */
export const MIN_VERSION = 1;

/** Maximum supported version. */
export const MAX_VERSION = 40;

/** Default quiet zone width in modules. */
export const QUIET_ZONE = 4;

/** All mask patterns in evaluation order. */
export const MASK_PATTERNS: readonly MaskPattern[] = [0, 1, 2, 3, 4, 5, 6, 7];
