/**
 * Static version information table (ISO/IEC 18004, Table 1).
 *
 * @packageDocumentation
 */

import { getAlignmentPatterns } from './alignment';
import type { VersionInfo } from './types';

/**
 * Total codewords per version (index 0 unused; index = version).
 * Source: ISO/IEC 18004, Table 1.
 */
export const TOTAL_CODEWORDS: readonly number[] = [
  0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901,
  991, 1085, 1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185, 2323, 2465, 2611,
  2761, 2876, 3034, 3196, 3362, 3532, 3706,
];

/**
 * Version information table for versions 1-40 (index = version - 1).
 * Each entry holds the total codeword count and alignment pattern coordinates.
 */
export const VERSION_INFO: readonly VersionInfo[] = buildVersionInfo();

function buildVersionInfo(): readonly VersionInfo[] {
  const table: VersionInfo[] = [];
  for (let version = 1; version <= 40; version++) {
    table.push({
      totalCodewords: TOTAL_CODEWORDS[version]!,
      alignment: getAlignmentPatterns(version),
    });
  }
  return table;
}

/**
 * Returns static information for a QR version.
 *
 * @param version - QR version (1-40)
 * @returns Total codeword count and alignment coordinates
 * @throws {RangeError} If version is outside 1-40
 */
export function getVersionInfo(version: number): VersionInfo {
  if (!Number.isInteger(version) || version < 1 || version > 40) {
    throw new RangeError(`getVersionInfo: version must be 1-40, got ${version}`);
  }
  return VERSION_INFO[version - 1]!;
}
