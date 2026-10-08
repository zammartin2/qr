/**
 * Encoding mode detection and character count widths.
 *
 * @packageDocumentation
 */

import { ALPHANUMERIC_CHARS, CHAR_COUNT_BITS } from '../constants';
import type { Mode } from '../types';

const NUMERIC_RE = /^[0-9]+$/;

/**
 * Chooses the most compact encoding mode for `text`.
 *
 * Detection order: numeric → alphanumeric → byte. Kanji is **never**
 * auto-detected because Shift JIS detection is ambiguous for Cyrillic and
 * other BMP text; pass `options.mode: 'kanji'` explicitly instead.
 *
 * @param text - Text to encode
 * @returns Detected mode (`'byte'` for empty text)
 * @throws {RangeError} If `text` is not a string
 */
export function chooseMode(text: string): Mode {
  if (typeof text !== 'string') {
    throw new RangeError('chooseMode: text must be a string');
  }
  if (text.length === 0) return 'byte';
  if (NUMERIC_RE.test(text)) return 'numeric';
  for (const ch of text) {
    if (!ALPHANUMERIC_CHARS.includes(ch)) return 'byte';
  }
  return 'alphanumeric';
}

/**
 * Returns the character count indicator width for a mode and version.
 *
 * Version groups: 1-9, 10-26, 27-40.
 *
 * @param mode - Encoding mode
 * @param version - QR version (1-40)
 * @returns Width of the character count indicator in bits
 * @throws {RangeError} If the mode or version is invalid
 */
export function charCountBits(mode: Mode, version: number): number {
  const widths = CHAR_COUNT_BITS[mode];
  if (!widths) {
    throw new RangeError(`charCountBits: unknown mode "${mode}"`);
  }
  if (!Number.isInteger(version) || version < 1 || version > 40) {
    throw new RangeError(`charCountBits: version must be 1-40, got ${version}`);
  }
  if (version <= 9) return widths[0];
  if (version <= 26) return widths[1];
  return widths[2];
}
