/**
 * Public QR generation entry point (`generateQR`).
 *
 * @packageDocumentation
 */

import { buildMatrix } from './matrix';
import { chooseMode } from './encode/mode';
import { countChars } from './encode/index';
import { chooseVersion } from './version';
import type { ECLevel, Mode, QROptions, QRCode } from './types';

const EC_LEVELS: readonly ECLevel[] = ['L', 'M', 'Q', 'H'];
const MODES: readonly Mode[] = ['numeric', 'alphanumeric', 'byte', 'kanji'];

function assertOneOf<T>(value: unknown, allowed: readonly T[], name: string): void {
  if (!allowed.includes(value as T)) {
    throw new RangeError(`${name} must be one of ${allowed.join(', ')}; got ${String(value)}`);
  }
}

function assertVersion(value: unknown, name: string): void {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 40) {
    throw new RangeError(`${name} must be an integer 1-40; got ${String(value)}`);
  }
}

/**
 * Generate QR code.
 *
 * @param text - Text to encode (UTF-8 supported)
 * @param options - Generation options
 * @returns QR code
 *
 * @example
 * ```typescript
 * const qr = generateQR('hello');
 * console.log(qr.version);  // 1
 * console.log(qr.ecLevel);  // 'M'
 * console.log(qr.mode);     // 'byte'
 * ```
 * @throws {TypeError} If `text` is not a string
 * @throws {RangeError} If an option is out of range, the forced mode cannot
 *   encode `text`, or no version within bounds can hold the data
 */
export function generateQR(text: string, options: QROptions = {}): QRCode {
  if (typeof text !== 'string') {
    throw new TypeError(`generateQR: text must be a string; got ${typeof text}`);
  }

  const ecLevel: ECLevel = options.ecLevel ?? 'M';
  assertOneOf(ecLevel, EC_LEVELS, 'ecLevel');

  if (options.version !== undefined) {
    assertVersion(options.version, 'version');
  }
  if (options.mask !== undefined) {
    if (!Number.isInteger(options.mask) || options.mask < 0 || options.mask > 7) {
      throw new RangeError(`mask must be an integer 0-7; got ${String(options.mask)}`);
    }
  }
  if (options.mode !== undefined) {
    assertOneOf(options.mode, MODES, 'mode');
  }
  if (options.minVersion !== undefined) {
    assertVersion(options.minVersion, 'minVersion');
  }
  if (options.maxVersion !== undefined) {
    assertVersion(options.maxVersion, 'maxVersion');
  }

  const mode: Mode = options.mode ?? chooseMode(text);
  const count = countChars(text, mode);

  const version =
    options.version ??
    chooseVersion({
      mode,
      count,
      ecLevel,
      minVersion: options.minVersion,
      maxVersion: options.maxVersion,
    });

  return buildMatrix(text, version, ecLevel, mode, options.mask);
}
