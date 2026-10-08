/**
 * Browser / Cloudflare Workers / Vercel Edge entry — no Node.js APIs.
 *
 * - `qrToPNG` is async (returns `Promise<Uint8Array>`); on Vercel Edge it
 *   throws a descriptive error (no CompressionStream there).
 * - `qrToFile` always throws (use `qrToPNG`/`qrToSVG` + Blob instead).
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
