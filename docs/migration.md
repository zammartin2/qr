# Migration guide

**Русская версия:** [ru/migration.md](ru/migration.md)

This guide covers migrating from `qrcode` (node-qrcode), `qrcode-generator` and similar libraries. For the full option reference, see [api.md](api.md); for recipes, see [examples.md](examples.md).

## From `qrcode` (node-qrcode)

> `qrcode` is also published as `node-qrcode` — it is the same package.

```typescript
// Before
import QRCode from 'qrcode';
await QRCode.toFile('qr.png', text, { errorCorrectionLevel: 'H', width: 300 });
const svg = await QRCode.toString(text, { type: 'svg' });

// After
import { generateQR, qrToFile, qrToSVG } from '@fab-orbita/qr';
const qr = generateQR(text, { ecLevel: 'H' });
// width 300 px ≈ scale * (qr.size + 2 * margin) → scale ≈ 300 / (qr.size + 8)
await qrToFile(qr, 'qr.png', { scale: Math.round(300 / (qr.size + 8)) });
const svg = qrToSVG(qr, { scale: 8 });
```

| `qrcode` | `@fab-orbita/qr` |
|---|---|
| `errorCorrectionLevel: 'M'` | `ecLevel: 'M'` (same `'L' \| 'M' \| 'Q' \| 'H'` values) |
| `version: 5` | `version: 5` |
| `maskPattern: 3` | `mask: 3` |
| `QRCode.toBuffer(text, opts)` | `qrToPNG(qr, opts)` — sync `Buffer` (Node) |
| `QRCode.toDataURL(text, opts)` | No direct equivalent — `qrToPNG` + your own base64 wrapper |
| `QRCode.toString(text, { type: 'svg' })` | `qrToSVG(qr, opts)` — sync string |
| `QRCode.toString(text, { type: 'terminal' })` | `qrToTerminal(qr, { small: true })` |
| `QRCode.create(text)` → `{ modules: { data, size } }` | `generateQR(text)` → `{ modules: boolean[][], size }` |
| `modules.data[row * size + col]` (packed) | `qr.modules[row][col]` (boolean) |
| `width` (px, total) | `scale` (px per module): `scale = width / (qr.size + 2 * margin)` |
| `margin` (modules, default 4) | `margin` (modules, default 4) |
| Callback / promise API | Synchronous renderers + `qrToFile` (async file write) |

### Differences to be aware of

- **Output is synchronous in Node** — no promises except `qrToFile`. In browsers and edge runtimes `qrToPNG` is async (`Promise<Uint8Array>`); the same import specifier resolves to the browser entry. See [browser.md](browser.md).
- **`modules` is `boolean[][]`**, not a packed `Uint8Array`. Iterate `qr.modules[row][col]`; the packed index `row * size + col` no longer applies.
- **Single mode per symbol.** `qrcode` segments strings into multiple modes automatically (mixing numeric + alphanumeric + byte). This library encodes one mode per symbol — either pass `mode` or let auto-detection pick the best single mode. For most inputs (URLs, digits, uppercase text) the result matches; for mixed-case + digits, `qrcode` may pick a smaller version.
- **Byte mode counts UTF-8 bytes**, not JS code units — same as the standard and `qrcode`.
- **`width` default differs.** `qrcode` computes width automatically from the module count; `@fab-orbita/qr` uses fixed `scale` defaults (PNG 4, SVG 1). Set `scale` explicitly for a specific pixel size.
- **Forcing mask skips penalty search.** Same as `qrcode` — the symbol is still valid, but may have a higher penalty score than auto-selection would produce.
- **Empty input is allowed here** (`qrcode` throws).
- **Kanji mode works out of the box**; `qrcode` requires injecting `toSJISFunc`.
- **Types are bundled** — no `@types/@fab-orbita__qr` package. Remove `@types/qrcode` from `devDependencies` after migrating.
- **Dual ESM + CJS** — import works natively in ESM projects, no interop wrapper needed. `qrcode` is CJS-only.
- **Zero runtime dependencies** — `qrcode` pulls `dijkstrajs`, `pngjs`, `yargs` and their transitive tree.

## From `qrcode-generator`

```typescript
// Before
import qrcode from 'qrcode-generator';
const qr = qrcode(0, 'M');
qr.addData('hello');
qr.make();
qr.createImgTag(4);       // or createSvgTag / createDataURL / createASCII

// After
import { generateQR, qrToSVG, qrToPNG, qrToTerminal, qrToASCII } from '@fab-orbita/qr';
const qr = generateQR('hello', { ecLevel: 'M' });
qrToSVG(qr, { scale: 4 });
qrToPNG(qr, { scale: 4 });
qrToTerminal(qr, { small: true });
qrToASCII(qr);
```

| `qrcode-generator` | `@fab-orbita/qr` |
|---|---|
| `qrcode(typeNumber, errorCorrectionLevel)` — `0` = auto | Omit `version` (auto) or set `version: 1..40` |
| `addData(data, mode)` (may be called repeatedly) | `generateQR(text, { mode })` — single mode per symbol |
| `createImgTag(cellSize)` | `qrToPNG` / `qrToSVG` + your own `<img>` or Blob wrapper |
| `createSvgTag(cellSize)` | `qrToSVG(qr, { scale: cellSize })` |
| `createDataURL(cellSize)` | `qrToPNG` + base64 wrapper |
| `createASCII(cellSize)` | `qrToASCII(qr)` — no cell size, 1 char per module |
| CJS only, no types | ESM + CJS, bundled `.d.ts` |
| Mask chosen internally, no penalty control | 8 masks + exposed `mask` option |

**Multi-segment not supported.** `qrcode-generator` allows repeated `addData` calls (mixing modes in one symbol); `@fab-orbita/qr` encodes a single mode per symbol. Pick the mode that fits your whole payload.

## From `qrcode-terminal`

```typescript
// Before
import qrcode from 'qrcode-terminal';
qrcode.generate('hello', { small: true });

// After
import { generateQR, qrToTerminal } from '@fab-orbita/qr';
console.log(qrToTerminal(generateQR('hello'), { small: true }));
```

## From `qr-image`

```typescript
// Before
import qr from 'qr-image';
import { writeFileSync } from 'node:fs';
writeFileSync('qr.png', qr.imageSync('hello', { type: 'png', size: 8 }));

// After
import { generateQR, qrToPNG } from '@fab-orbita/qr';
import { writeFileSync } from 'node:fs';
writeFileSync('qr.png', qrToPNG(generateQR('hello'), { scale: 8 }));
```

## From other libraries

General mapping:

- Replace promise/callback renderers with the synchronous `qrToSVG` / `qrToPNG` / `qrToTerminal` / `qrToASCII`. Only `qrToFile` is async (and Node-only).
- Map error-correction names — most libraries use the same L/M/Q/H.
- If you relied on multi-segment optimisation (mixing numeric + byte in one symbol), pick the single best mode manually via `mode` — capacity differences are small for typical payloads.
- Pixel-oriented options (`width`, `scale` in px) become `scale` in modules — multiply by the module count if you need exact pixel sizes: `width ≈ scale * (qr.size + 2 * margin)`.

---

Applies to v1.1.0. See [CHANGELOG.md](../CHANGELOG.md) for history.
