/**
 * Node.js / Deno / Bun entry.
 *
 * Guarantees: `qrToPNG` is synchronous and returns a `Buffer`;
 * `qrToFile` writes to disk.
 *
 * @packageDocumentation
 */

export type {
  ECLevel,
  Mode,
  MaskPattern,
  QROptions,
  QRCode,
  RenderOptions,
} from './core/types';

export { generateQR } from './core/generate';
export { qrToASCII } from './render/ascii';
export { qrToPNG } from './render/png/node';
export { qrToSVG } from './render/svg';
export { qrToTerminal } from './render/terminal';
export { qrToFile } from './render/file/node';
