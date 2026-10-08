/**
 * Terminal renderer using Unicode half-block characters.
 *
 * @packageDocumentation
 */

import type { QRCode } from '../core/types';

/**
 * Renders a QR code for the terminal.
 *
 * - Default: two characters per module (`██` dark, two spaces light) so the
 *   symbol keeps a 1:1 aspect ratio in monospace fonts.
 * - `small: true`: two module rows are combined into one text line with the
 *   half-block characters `█`, `▀`, `▄` and space (odd module counts pad the
 *   missing bottom row with light modules).
 *
 * No ANSI colour codes are emitted.
 *
 * @param qr - QR code
 * @param options - Render options
 * @param [options.small=false] - Combine two rows per line
 * @returns Terminal string (lines separated by `\n`, no trailing newline)
 *
 * @example
 * ```typescript
 * console.log(qrToTerminal(generateQR('hello'), { small: true }));
 * ```
 */
export function qrToTerminal(qr: QRCode, options: { small?: boolean } = {}): string {
  const { modules, size } = qr;
  const lines: string[] = [];

  if (options.small) {
    for (let row = 0; row < size; row += 2) {
      let line = '';
      for (let col = 0; col < size; col++) {
        const top = modules[row]![col]!;
        const bottom = modules[row + 1]?.[col] ?? false;
        if (top && bottom) line += '█';
        else if (top) line += '▀';
        else if (bottom) line += '▄';
        else line += ' ';
      }
      lines.push(line);
    }
  } else {
    for (let row = 0; row < size; row++) {
      let line = '';
      for (let col = 0; col < size; col++) {
        line += modules[row]![col] ? '██' : '  ';
      }
      lines.push(line);
    }
  }

  return lines.join('\n');
}
