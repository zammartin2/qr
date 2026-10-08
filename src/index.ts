/**
 * Universal entry — works in every runtime without `node:*` imports.
 *
 * - Node.js: resolves the `node` condition to `./index.node` (full API);
 *   this file is only the `default` fallback.
 * - Browser: resolves the `browser` condition to `./index.browser`.
 * - Here (fallback): `qrToPNG` is async (CompressionStream), `qrToFile`
 *   throws a descriptive error.
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
export { qrToPNG } from './render/png/browser';
export { qrToSVG } from './render/svg';
export { qrToTerminal } from './render/terminal';
export { qrToFile } from './render/file/stub';
