# API reference

**Русская версия:** [ru/api.md](ru/api.md)

All public exports of `@fab-orbita/qr`.

## Entry points

| Import | Runtime | `qrToPNG` | `qrToFile` |
|---|---|---|---|
| `@fab-orbita/qr` in Node/Deno/Bun (via `node`/`deno`/`bun` conditions) | Node-like | **sync → `Buffer`** | real |
| `@fab-orbita/qr` in browser bundlers (via `browser`/`workerd`/`edge-*` conditions) | browser-like | **async → `Promise<Uint8Array>`** | stub (throws) |
| `@fab-orbita/qr` (default fallback) | universal | async → `Promise<Uint8Array>` | stub (throws) |
| `@fab-orbita/qr/node` | Node / Deno / Bun | sync → `Buffer` | real |
| `@fab-orbita/qr/browser` | browser / Workers / Edge | async → `Promise<Uint8Array>` | stub (throws) |

See [browser.md](browser.md) for the environment support matrix.

## Types

```typescript
type ECLevel = 'L' | 'M' | 'Q' | 'H';
type Mode = 'numeric' | 'alphanumeric' | 'byte' | 'kanji';
type MaskPattern = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface QROptions {
  ecLevel?: ECLevel;      // default 'M'
  version?: number;       // 1-40, force a specific version
  mask?: MaskPattern;     // 0-7, force a specific mask
  mode?: Mode;            // force an encoding mode
  minVersion?: number;    // lower bound for auto version selection
  maxVersion?: number;    // upper bound for auto version selection
}

interface QRCode {
  modules: boolean[][];   // true = dark; modules[row][col]
  size: number;           // 4 * version + 17
  version: number;        // 1-40
  ecLevel: ECLevel;
  mask: MaskPattern;
  mode: Mode;
}

interface RenderOptions {
  scale?: number;         // SVG: default 1; PNG: default 4
  margin?: number;        // quiet zone in modules, default 4
  dark?: string;          // SVG: any CSS colour (XML-escaped); PNG: '#000000' (#RGB / #RRGGBB only)
  light?: string;         // SVG: any CSS colour (XML-escaped); PNG: '#ffffff' (#RGB / #RRGGBB only)
}
```

`QRCode.modules` is a plain `boolean[][]` — treat it as read-only. Mutating it after generation produces an inconsistent symbol.

## generateQR

```typescript
function generateQR(text: string, options?: QROptions): QRCode;
```

Generates a QR code symbol.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `text` | `string` | — | Text to encode (UTF-8) |
| `options.ecLevel` | `ECLevel` | `'M'` | Error correction level |
| `options.version` | `number` | auto | Force version 1–40 |
| `options.mask` | `MaskPattern` | auto | Force mask 0–7 (skips penalty search) |
| `options.mode` | `Mode` | auto | Force encoding mode |
| `options.minVersion` | `number` | 1 | Auto-selection lower bound |
| `options.maxVersion` | `number` | 40 | Auto-selection upper bound |

**Version selection.** If `options.version` is set, it is used directly and `minVersion`/`maxVersion` are ignored. Otherwise the smallest version in `[minVersion, maxVersion]` that fits the data is chosen.

**Mode auto-detection** (when `options.mode` is omitted): pure digits → numeric; characters from the ISO/IEC 646 subset `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:` → alphanumeric; everything else (including empty string) → byte.

Kanji is never auto-detected — Shift JIS detection is ambiguous for Cyrillic and other BMP text. Pass `mode: 'kanji'` explicitly.

### Errors

- `TypeError` — `text` is not a string.
- `RangeError` — an option is out of range; `minVersion > maxVersion`; the forced mode cannot encode text; no version in range fits the data; the forced version is too small for the data.

### Example

```typescript
const qr = generateQR('hello');
console.log(qr.version);  // 1
console.log(qr.ecLevel);  // 'M'
console.log(qr.mode);     // 'byte'
console.log(qr.size);     // 21

generateQR('hello', { ecLevel: 'H' });
generateQR('hello', { version: 5 });
generateQR('hello', { mask: 3 });
generateQR('12345', { mode: 'numeric' });
generateQR('HELLO', { mode: 'alphanumeric' });
generateQR('hi', { minVersion: 7 });
```

## qrToTerminal

```typescript
function qrToTerminal(qr: QRCode, options?: { small?: boolean }): string;
```

Renders to a terminal-ready string (no ANSI codes, no trailing newline).

Default: two characters per module (`██` dark, spaces light) — correct 1:1 aspect ratio in monospace fonts.

`small: true`: two module rows per text line using `█`, `▀`, `▄` and space. For odd size, the last line treats the missing bottom row as light modules.

```typescript
console.log(qrToTerminal(qr));
console.log(qrToTerminal(qr, { small: true }));
```

## qrToSVG

```typescript
function qrToSVG(qr: QRCode, options?: RenderOptions): string;
```

Renders a standalone SVG document. The `viewBox` is in module units (`size + 2 * margin`); width/height are scale times the view box. Dark modules are merged into a single `<path>`; colours are XML-escaped.

| Option | Default | Description |
|---|---|---|
| `scale` | 1 | Non-negative integer multiplier. 0 is allowed and produces a zero-sized SVG. |
| `margin` | 4 | Quiet zone in modules |
| `dark` | `'#000000'` | Dark fill colour (any CSS colour string; XML-escaped) |
| `light` | `'#ffffff'` | Background colour (any CSS colour string; XML-escaped) |

Throws `RangeError` for negative/non-integer scale or margin.

```typescript
const svg = qrToSVG(qr, { scale: 10, margin: 4, dark: '#101820' });
```

## qrToPNG

```typescript
// Node entry (@fab-orbita/qr/node, or "." in Node.js):
function qrToPNG(qr: QRCode, options?: RenderOptions): Buffer;

// Browser / universal entries:
function qrToPNG(qr: QRCode, options?: RenderOptions): Promise<Uint8Array>;
```

Renders a PNG: 8-bit indexed colour (palette entry 0 = dark, entry 1 = light), filter type 0, own CRC-32. Compression differs by entry:

- **Node** — `node:zlib` `deflateSync`, synchronous.
- **Browser / edge** — `CompressionStream('deflate')`, async. If the runtime has no `CompressionStream` (e.g. Vercel Edge Functions), it throws a descriptive error pointing at this document.

Pixel output is identical between the two implementations.

| Option | Default | Description |
|---|---|---|
| `scale` | 4 | Pixels per module (non-negative integer) |
| `margin` | 4 | Quiet zone in modules |
| `dark` | `'#000000'` | `#RGB` or `#RRGGBB` only |
| `light` | `'#ffffff'` | `#RGB` or `#RRGGBB` only |

Throws `RangeError` for invalid geometry or a colour that is not hex.

```typescript
// Node.js
writeFileSync('qr.png', qrToPNG(qr, { scale: 8, dark: '#123456' }));

// Browser
const bytes = await qrToPNG(qr, { scale: 8 });
const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
```

## qrToASCII

```typescript
function qrToASCII(qr: QRCode): string;
```

Renders ASCII art: `1` for dark, `0` for light; `size` lines, no trailing newline. No quiet zone is added — the output is exactly `size × size` characters.

```typescript
console.log(qrToASCII(qr));
```

## qrToFile

```typescript
function qrToFile(qr: QRCode, path: string, options?: RenderOptions): Promise<void>;
```

Node.js only (`@fab-orbita/qr/node`, or `"."` in Node). Writes the symbol to disk. Format by extension (taken from the final path segment):

| Extension | Renderer | Options used |
|---|---|---|
| `.svg` | `qrToSVG` | scale, margin, dark, light |
| `.png` | `qrToPNG` | scale, margin, dark, light |
| `.txt`, `.ascii` | `qrToASCII` | none — options is ignored |

Any other extension (or a path without an extension) rejects with `RangeError`; a non-string path rejects with `TypeError`.

In browsers and other non-Node runtimes the same signature exists but always rejects with a descriptive error that names the `@fab-orbita/qr/node` subpath — use `qrToPNG`/`qrToSVG` + Blob/data URL instead.

```typescript
await qrToFile(qr, 'qr.svg');
await qrToFile(qr, 'qr.png');
```
