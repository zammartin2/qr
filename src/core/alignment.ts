/**
 * Alignment pattern placement (ISO/IEC 18004, section 6.3.6).
 *
 * @packageDocumentation
 */

/**
 * Returns the row/column coordinates of alignment pattern centers for a version.
 *
 * Coordinates are symmetric along the main diagonal; the same list is used for
 * rows and columns. Version 1 has no alignment patterns.
 *
 * @param version - QR version (1-40)
 * @returns Ascending center coordinates (empty for version 1)
 * @throws {RangeError} If version is outside 1-40
 */
export function getAlignmentPatterns(version: number): number[] {
  if (!Number.isInteger(version) || version < 1 || version > 40) {
    throw new RangeError(`getAlignmentPatterns: version must be 1-40, got ${version}`);
  }
  if (version === 1) return [];

  const posCount = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  // Version 32 (size 145) is the one case where the uniform formula would
  // produce 27.2; the standard fixes the interval at 26.
  const step = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;

  const positions: number[] = [size - 7];
  for (let i = 1; i < posCount - 1; i++) {
    positions.push(positions[i - 1]! - step);
  }
  positions.push(6);
  positions.reverse();
  return positions;
}

/**
 * Returns all alignment pattern center coordinates `(row, col)` for a version,
 * excluding the three positions occupied by finder patterns.
 *
 * @param version - QR version (1-40)
 * @returns List of `[row, col]` center pairs
 * @throws {RangeError} If version is outside 1-40
 */
export function getAlignmentCenters(version: number): [number, number][] {
  const coords = getAlignmentPatterns(version);
  const n = coords.length;
  const centers: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      // Skip the three corners overlapping finder patterns.
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) {
        continue;
      }
      centers.push([coords[i]!, coords[j]!]);
    }
  }
  return centers;
}

/**
 * Draws 5x5 alignment patterns onto the matrix and marks their modules reserved.
 *
 * Patterns may overlap timing patterns; the overlapping modules stay reserved.
 * Version 1 is a no-op.
 *
 * @param matrix - Module matrix (`matrix[row][col] !== 0` = dark)
 * @param version - QR version (1-40)
 * @param reserved - Reservation map marked `true` for function/reserved modules
 * @throws {RangeError} If version is outside 1-40
 */
export function placeAlignmentPatterns(
  matrix: number[][],
  version: number,
  reserved: boolean[][],
): void {
  for (const [row, col] of getAlignmentCenters(version)) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const r = row + dr;
        const c = col + dc;
        // Ring at Chebyshev distance 2 (or center) is dark; distance 1 is light.
        const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
        matrix[r]![c] = dark ? 1 : 0;
        reserved[r]![c] = true;
      }
    }
  }
}
