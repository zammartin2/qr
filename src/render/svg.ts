/**
 * SVG renderer.
 *
 * @packageDocumentation
 */

import { QUIET_ZONE } from '../core/constants';
import type { QRCode, RenderOptions } from '../core/types';

/**
 * Escapes a string for safe use inside a double-quoted XML attribute.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Renders a QR code as a standalone SVG document.
 *
 * The `viewBox` is in module units (`size + 2 * margin`); `width`/`height`
 * are `scale` times the view box. Dark modules are merged into a single
 * `<path>` of one-unit rectangles for a compact file.
 *
 * @param qr - QR code
 * @param options - Render options
 * @param [options.scale=1] - Output size multiplier (viewBox units per unit)
 * @param [options.margin=4] - Quiet zone in modules
 * @param [options.dark='#000000'] - Dark colour (any CSS colour string, XML-escaped)
 * @param [options.light='#ffffff'] - Light colour
 * @returns SVG string
 *
 * @example
 * ```typescript
 * const svg = qrToSVG(generateQR('hello'), { scale: 10, margin: 4 });
 * ```
 * @throws {RangeError} If `scale` or `margin` is negative or non-integer
 */
export function qrToSVG(qr: QRCode, options: RenderOptions = {}): string {
  const scale = options.scale ?? 1;
  const margin = options.margin ?? QUIET_ZONE;
  const dark = options.dark ?? '#000000';
  const light = options.light ?? '#ffffff';

  if (!Number.isInteger(scale) || scale < 0) {
    throw new RangeError(`qrToSVG: scale must be a non-negative integer; got ${String(scale)}`);
  }
  if (!Number.isInteger(margin) || margin < 0) {
    throw new RangeError(`qrToSVG: margin must be a non-negative integer; got ${String(margin)}`);
  }

  const { modules, size } = qr;
  const viewSize = size + margin * 2;
  const pixelSize = viewSize * scale;

  // Merge horizontal runs of dark modules into path segments.
  const segments: string[] = [];
  for (let row = 0; row < size; row++) {
    let col = 0;
    while (col < size) {
      if (!modules[row]![col]) {
        col++;
        continue;
      }
      let run = 1;
      while (col + run < size && modules[row]![col + run]) run++;
      const x = margin + col;
      const y = margin + row;
      segments.push(`M${x} ${y}h${run}v1h-${run}z`);
      col += run;
    }
  }

  const pathData = segments.join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ` +
    `width="${pixelSize}" height="${pixelSize}" ` +
    `viewBox="0 0 ${viewSize} ${viewSize}" shape-rendering="crispEdges">\n` +
    `<rect width="${viewSize}" height="${viewSize}" fill="${escapeXml(light)}"/>\n` +
    `<path d="${pathData}" fill="${escapeXml(dark)}"/>\n` +
    `</svg>\n`
  );
}
