/**
 * ASCII art renderer.
 *
 * @packageDocumentation
 */

import type { QRCode } from '../core/types';

/**
 * Renders a QR code as ASCII art: one line per row, `1` for dark modules
 * and `0` for light modules, no trailing newline.
 *
 * @param qr - QR code
 * @returns ASCII string (`size` lines of `size` characters)
 *
 * @example
 * ```typescript
 * console.log(qrToASCII(generateQR('hello')));
 * ```
 */
export function qrToASCII(qr: QRCode): string {
  return qr.modules.map((row) => row.map((cell) => (cell ? '1' : '0')).join('')).join('\n');
}
