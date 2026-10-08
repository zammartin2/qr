/**
 * Public type definitions for @fab-orbita/qr.
 *
 * @packageDocumentation
 */

/**
 * Error correction level (ISO/IEC 18004).
 *
 * - `L` — ~7% recovery
 * - `M` — ~15% recovery
 * - `Q` — ~25% recovery
 * - `H` — ~30% recovery
 */
export type ECLevel = 'L' | 'M' | 'Q' | 'H';

/**
 * Data encoding mode.
 *
 * - `numeric` — decimal digits 0-9
 * - `alphanumeric` — ISO-IEC 646 subset (45 characters)
 * - `byte` — ISO-8859-1 / UTF-8 bytes
 * - `kanji` — Shift JIS double-byte characters (explicit `mode` option only, never auto-detected)
 */
export type Mode = 'numeric' | 'alphanumeric' | 'byte' | 'kanji';

/**
 * Mask pattern index (0-7) per ISO/IEC 18004.
 */
export type MaskPattern = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Options for {@link generateQR}.
 */
export interface QROptions {
  /** Error correction level. Default: `'M'`. */
  ecLevel?: ECLevel;
  /** Force a specific QR version (1-40). Default: minimal version that fits. */
  version?: number;
  /** Force a specific mask pattern (0-7). Default: automatic penalty-based selection. */
  mask?: MaskPattern;
  /** Force an encoding mode. Default: auto-detection (kanji is never auto-detected). */
  mode?: Mode;
  /** Lower bound for automatic version selection (1-40). */
  minVersion?: number;
  /** Upper bound for automatic version selection (1-40). */
  maxVersion?: number;
}

/**
 * A generated QR code symbol.
 */
export interface QRCode {
  /** Module matrix, `true` = dark. `modules[row][col]`. */
  modules: boolean[][];
  /** Symbol side length in modules (`4 * version + 17`). */
  size: number;
  /** Symbol version (1-40). */
  version: number;
  /** Error correction level used. */
  ecLevel: ECLevel;
  /** Mask pattern applied (0-7). */
  mask: MaskPattern;
  /** Encoding mode used. */
  mode: Mode;
}

/**
 * Options for renderers (`qrToSVG`, `qrToPNG`, `qrToFile`).
 */
export interface RenderOptions {
  /** Module size in output units (SVG units / PNG pixels). Default: `1` for SVG, `4` for PNG. */
  scale?: number;
  /** Quiet zone width in modules. Default: `4`. */
  margin?: number;
  /** Dark color. Default: black / `#000000`. */
  dark?: string;
  /** Light color. Default: white / `#ffffff`. */
  light?: string;
}

/**
 * Static per-version information (ISO/IEC 18004, Table 1).
 */
export interface VersionInfo {
  /** Total codewords (data + error correction) for the version. */
  totalCodewords: number;
  /** Alignment pattern center coordinates (empty for version 1). */
  alignment: number[];
}

/**
 * Error correction block layout for one version/EC combination
 * (ISO/IEC 18004, Table 9).
 *
 * Group 2 (when present) blocks hold exactly one more data codeword than
 * group 1 blocks. When `numBlocksGroup2` is 0, `dataCodewordsGroup2` is 0.
 */
export interface ECBlockInfo {
  /** Error correction codewords per block. */
  ecPerBlock: number;
  /** Number of blocks in group 1. */
  numBlocksGroup1: number;
  /** Number of blocks in group 2 (0 or 1+). */
  numBlocksGroup2: number;
  /** Data codewords per block in group 1. */
  dataCodewordsGroup1: number;
  /** Data codewords per block in group 2 (0 if no group 2). */
  dataCodewordsGroup2: number;
}
