/**
 * Data masking: 8 mask patterns, penalty scoring, and automatic selection
 * (ISO/IEC 18004, sections 6.8 and 8.8).
 *
 * @packageDocumentation
 */

import type { ECLevel, MaskPattern } from './types';
import { placeFormatInfo } from './format';

/**
 * Returns whether mask `mask` inverts the module at (`row`, `col`).
 *
 * @param row - Row index (0-based)
 * @param col - Column index (0-based)
 * @param mask - Mask pattern (0-7)
 * @returns `true` if the module must be inverted
 * @throws {RangeError} If `mask` is outside 0-7
 */
export function isMasked(row: number, col: number, mask: MaskPattern): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    case 7:
      return (((row * col) % 3) + ((row + col) % 2)) % 2 === 0;
    default:
      throw new RangeError(`isMasked: invalid mask pattern ${mask}`);
  }
}

/**
 * Applies (or removes — the operation is its own inverse) a mask pattern to
 * all non-reserved modules.
 *
 * @param matrix - Module matrix (`0`/`1`), mutated in place
 * @param reserved - Reservation map: `true` for function/reserved modules
 * @param mask - Mask pattern (0-7)
 * @throws {RangeError} If `mask` is outside 0-7
 */
export function applyMask(
  matrix: number[][],
  reserved: boolean[][],
  mask: MaskPattern,
): void {
  if (!Number.isInteger(mask) || mask < 0 || mask > 7) {
    throw new RangeError(`applyMask: invalid mask pattern ${mask}`);
  }
  const size = matrix.length;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (reserved[row]![col]) continue;
      if (isMasked(row, col, mask)) {
        matrix[row]![col]! ^= 1;
      }
    }
  }
}

/** Penalty weights (ISO/IEC 18004, table 24). */
const N1 = 3;
const N2 = 3;
const N3 = 40;
const N4 = 10;

/**
 * N1 penalty: runs of 5+ modules of the same colour in rows and columns.
 * `3 + (length - 5)` per run.
 *
 * @param matrix - Module matrix (`0`/`1`)
 * @returns N1 points
 */
export function penaltyN1(matrix: number[][]): number {
  const size = matrix.length;
  let points = 0;
  for (let i = 0; i < size; i++) {
    let runRow = 1;
    let runCol = 1;
    for (let j = 1; j < size; j++) {
      if (matrix[i]![j] === matrix[i]![j - 1]) runRow++;
      else {
        if (runRow >= 5) points += N1 + (runRow - 5);
        runRow = 1;
      }
      if (matrix[j]![i] === matrix[j - 1]![i]) runCol++;
      else {
        if (runCol >= 5) points += N1 + (runCol - 5);
        runCol = 1;
      }
    }
    if (runRow >= 5) points += N1 + (runRow - 5);
    if (runCol >= 5) points += N1 + (runCol - 5);
  }
  return points;
}

/**
 * N2 penalty: 3 points for each 2x2 block of the same colour
 * (overlapping blocks count separately).
 *
 * @param matrix - Module matrix (`0`/`1`)
 * @returns N2 points
 */
export function penaltyN2(matrix: number[][]): number {
  const size = matrix.length;
  let blocks = 0;
  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      const sum =
        matrix[row]![col]! +
        matrix[row]![col + 1]! +
        matrix[row + 1]![col]! +
        matrix[row + 1]![col + 1]!;
      if (sum === 0 || sum === 4) blocks++;
    }
  }
  return blocks * N2;
}

/**
 * N3 penalty: 40 points for each 1:1:3:1:1 finder-like pattern preceded or
 * followed by a 4-module light area (`10111010000` or `00001011101` in an
 * 11-module window), in rows and columns. A pattern with light areas on both
 * sides counts twice.
 *
 * @param matrix - Module matrix (`0`/`1`)
 * @returns N3 points
 */
export function penaltyN3(matrix: number[][]): number {
  const size = matrix.length;
  let points = 0;
  for (let i = 0; i < size; i++) {
    let rowBits = 0;
    let colBits = 0;
    for (let j = 0; j < size; j++) {
      rowBits = ((rowBits << 1) & 0x7ff) | matrix[i]![j]!;
      if (j >= 10 && (rowBits === 0x5d0 || rowBits === 0x05d)) points++;

      colBits = ((colBits << 1) & 0x7ff) | matrix[j]![i]!;
      if (j >= 10 && (colBits === 0x5d0 || colBits === 0x05d)) points++;
    }
  }
  return points * N3;
}

/**
 * N4 penalty: `10 * |ceil(darkPercent / 5) - 10|` — deviation of the dark
 * module share from 50% in 5% steps. Semantics are pinned to the qrcode
 * reference implementation (see docs/compliance.md for the ISO wording).
 *
 * @param matrix - Module matrix (`0`/`1`)
 * @returns N4 points
 */
export function penaltyN4(matrix: number[][]): number {
  let dark = 0;
  let total = 0;
  for (const row of matrix) {
    for (const cell of row) {
      dark += cell;
      total++;
    }
  }
  const k = Math.abs(Math.ceil(dark * 100 / total / 5) - 10);
  return k * N4;
}

/**
 * Calculates the total mask penalty score of a (already masked) matrix.
 *
 * The matrix must contain the format information for the mask being scored
 * (ISO/IEC 18004 evaluates the whole symbol including format bits).
 *
 * @param matrix - Module matrix (`0`/`1`)
 * @returns Total penalty (N1 + N2 + N3 + N4)
 */
export function calculatePenalty(matrix: number[][]): number {
  return penaltyN1(matrix) + penaltyN2(matrix) + penaltyN3(matrix) + penaltyN4(matrix);
}

/**
 * Selects the mask pattern with the lowest penalty score.
 *
 * For each candidate the format information is (re)written, the mask is
 * applied, the penalty is scored, and the mask is removed again (XOR is an
 * involution). Ties go to the lowest mask index.
 *
 * On return the matrix is **unmasked** but the format area holds the bits of
 * mask 7 (the last candidate); the caller must apply the winning mask and
 * rewrite the format information.
 *
 * @param matrix - Module matrix (`0`/`1`), mutated during evaluation
 * @param reserved - Reservation map
 * @param ecLevel - Error correction level (needed to write format bits)
 * @returns Best mask pattern (0-7)
 * @throws {RangeError} If inputs are invalid
 */
export function findBestMask(
  matrix: number[][],
  reserved: boolean[][],
  ecLevel: ECLevel,
): MaskPattern {
  let best = 0;
  let lowerPenalty = Infinity;
  for (let p = 0 as MaskPattern; p <= 7; p++) {
    placeFormatInfo(matrix, ecLevel, p);
    applyMask(matrix, reserved, p);
    const penalty = calculatePenalty(matrix);
    applyMask(matrix, reserved, p);
    if (penalty < lowerPenalty) {
      lowerPenalty = penalty;
      best = p;
    }
  }
  return best as MaskPattern;
}
