/**
 * QR symbol matrix construction (ISO/IEC 18004, section 6.7).
 *
 * Pipeline: function patterns → data placement → mask selection →
 * format information.
 *
 * @packageDocumentation
 */

import { placeAlignmentPatterns } from './alignment';
import { EC_BLOCKS } from './ec-blocks';
import { encodeData } from './encode/index';
import { placeFormatInfo } from './format';
import { applyMask, findBestMask } from './mask';
import { interleaveBlocks, rsEncode } from './rs';
import type { ECLevel, MaskPattern, Mode, QRCode } from './types';
import { placeVersionInfo, symbolSize } from './version';

/**
 * Creates an all-light matrix and reservation map of the given size.
 */
function createMatrices(size: number): [number[][], boolean[][]] {
  const matrix: number[][] = [];
  const reserved: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    matrix.push(new Array<number>(size).fill(0));
    reserved.push(new Array<boolean>(size).fill(false));
  }
  return [matrix, reserved];
}

/**
 * Draws the three finder patterns with their light separators (reserved).
 */
function drawFinderPatterns(matrix: number[][], reserved: boolean[][]): void {
  const size = matrix.length;
  const origins: [number, number][] = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];
  for (const [row, col] of origins) {
    // Cover the finder (7x7) plus its separator ring (8x8), clipped to bounds.
    for (let dr = -1; dr <= 7; dr++) {
      const r = row + dr;
      if (r < 0 || r >= size) continue;
      for (let dc = -1; dc <= 7; dc++) {
        const c = col + dc;
        if (c < 0 || c >= size) continue;
        const inside = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        let dark = false;
        if (inside) {
          // Chebyshev rings from the centre: d=3 outer dark, d=2 light,
          // d<=1 the 3x3 dark core.
          const d = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
          dark = d !== 2;
        }
        matrix[r]![c] = dark ? 1 : 0;
        reserved[r]![c] = true;
      }
    }
  }
}

/**
 * Draws the horizontal and vertical timing patterns between the separators.
 */
function drawTimingPatterns(matrix: number[][], reserved: boolean[][]): void {
  const size = matrix.length;
  for (let r = 8; r < size - 8; r++) {
    const value = r % 2 === 0 ? 1 : 0;
    matrix[r]![6] = value;
    reserved[r]![6] = true;
    matrix[6]![r] = value;
    reserved[6]![r] = true;
  }
}

/**
 * Reserves the dark module (always at row `4 * version + 9`, column 8).
 */
function drawDarkModule(matrix: number[][], reserved: boolean[][], version: number): void {
  const row = 4 * version + 9;
  matrix[row]![8] = 1;
  reserved[row]![8] = true;
}

/**
 * Marks the 30 format information cells reserved (values are placeholders
 * until the mask is chosen).
 */
function reserveFormatAreas(reserved: boolean[][]): void {
  const size = reserved.length;
  // Copy 1 (around the top-left finder).
  const copy1: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    [8, 7], [8, 8], [7, 8],
    [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  // Copy 2 (bottom of column 8 and right of row 8).
  const copy2: [number, number][] = [];
  for (let i = 0; i < 7; i++) copy2.push([size - 1 - i, 8]);
  for (let i = 0; i < 8; i++) copy2.push([8, size - 1 - i]);

  for (const [r, c] of [...copy1, ...copy2]) {
    reserved[r]![c] = true;
  }
}

/**
 * Places the interleaved codeword bits into the encoding region in the
 * standard zigzag order (column pairs from the right, alternating direction,
 * timing column 6 skipped). Remaining positions stay light (remainder bits).
 */
function placeDataBits(matrix: number[][], reserved: boolean[][], data: number[]): void {
  const size = matrix.length;
  let inc = -1;
  let row = size - 1;
  let bitIndex = 7;
  let byteIndex = 0;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;

    for (;;) {
      for (let c = 0; c < 2; c++) {
        const currentCol = col - c;
        if (!reserved[row]![currentCol]) {
          let dark = false;
          if (byteIndex < data.length) {
            dark = ((data[byteIndex]! >>> bitIndex) & 1) === 1;
          }
          matrix[row]![currentCol] = dark ? 1 : 0;
          bitIndex--;
          if (bitIndex === -1) {
            byteIndex++;
            bitIndex = 7;
          }
        }
      }
      row += inc;
      if (row < 0 || row >= size) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
  }
}

/**
 * Encodes the data codewords, splits them into RS blocks, and interleaves
 * the result into the final message sequence.
 */
function buildFinalMessage(
  text: string,
  mode: Mode,
  version: number,
  ecLevel: ECLevel,
): number[] {
  const dataCw = encodeData(text, mode, version, ecLevel);
  const info = EC_BLOCKS[ecLevel][version - 1]!;

  const blocks: number[][] = [];
  const dataLengths: number[] = [];
  let offset = 0;
  const totalBlocks = info.numBlocksGroup1 + info.numBlocksGroup2;

  for (let b = 0; b < totalBlocks; b++) {
    const dataSize =
      b < info.numBlocksGroup1 ? info.dataCodewordsGroup1 : info.dataCodewordsGroup2;
    const blockData = dataCw.slice(offset, offset + dataSize);
    offset += dataSize;
    blocks.push([...blockData, ...rsEncode(blockData, info.ecPerBlock)]);
    dataLengths.push(dataSize);
  }

  return interleaveBlocks(blocks, dataLengths);
}

/**
 * Builds a complete QR code symbol.
 *
 * @param text - Text to encode
 * @param version - QR version (1-40), must fit the payload
 * @param ecLevel - Error correction level
 * @param mode - Encoding mode
 * @param [mask] - Force a mask pattern (0-7); default: automatic selection
 * @returns The generated {@link QRCode}
 * @throws {RangeError} If the version cannot hold the data, the payload is
 *   invalid for `mode`, or any option is out of range
 */
export function buildMatrix(
  text: string,
  version: number,
  ecLevel: ECLevel,
  mode: Mode,
  mask?: MaskPattern,
): QRCode {
  if (mask !== undefined && (!Number.isInteger(mask) || mask < 0 || mask > 7)) {
    throw new RangeError(`buildMatrix: invalid mask pattern ${mask}`);
  }

  const size = symbolSize(version);
  const [matrix, reserved] = createMatrices(size);

  drawFinderPatterns(matrix, reserved);
  drawTimingPatterns(matrix, reserved);
  placeAlignmentPatterns(matrix, version, reserved);
  drawDarkModule(matrix, reserved, version);
  reserveFormatAreas(reserved);
  if (version >= 7) {
    placeVersionInfo(matrix, reserved, version);
  }

  const message = buildFinalMessage(text, mode, version, ecLevel);
  placeDataBits(matrix, reserved, message);

  const chosenMask = mask ?? findBestMask(matrix, reserved, ecLevel);
  applyMask(matrix, reserved, chosenMask);
  placeFormatInfo(matrix, ecLevel, chosenMask);

  return {
    modules: matrix.map((row) => row.map((cell) => cell === 1)),
    size,
    version,
    ecLevel,
    mask: chosenMask,
    mode,
  };
}
