import type { QRCode } from '../src/core/types';

/**
 * Builds a QRCode-shaped fixture from an explicit module grid.
 * Renderers only read `modules` and `size`.
 */
export function fromModules(modules: boolean[][]): QRCode {
  return {
    modules,
    size: modules.length,
    version: 1,
    ecLevel: 'M',
    mask: 0,
    mode: 'byte',
  };
}

/**
 * 3x3 fixture:
 * ```
 * 101
 * 010
 * 101
 * ```
 */
export function fixture3(): QRCode {
  return fromModules([
    [true, false, true],
    [false, true, false],
    [true, false, true],
  ]);
}

/**
 * 5x5 fixture with mixed runs:
 * ```
 * 10101
 * 01010
 * 11100
 * 00111
 * 11111
 * ```
 */
export function fixture5(): QRCode {
  return fromModules([
    [true, false, true, false, true],
    [false, true, false, true, false],
    [true, true, true, false, false],
    [false, false, true, true, true],
    [true, true, true, true, true],
  ]);
}
