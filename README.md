# @fab-orbita/qr

> **Zero-dependency QR code generator with full ISO/IEC 18004 compliance.**

[🇷🇺 Русская версия](README.ru.md)

[![npm version](https://img.shields.io/npm/v/@fab-orbita/qr.svg?style=flat-square)](https://www.npmjs.com/package/@fab-orbita/qr)
[![npm downloads](https://img.shields.io/npm/dm/@fab-orbita/qr.svg?style=flat-square)](https://www.npmjs.com/package/@fab-orbita/qr)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@fab-orbita/qr?style=flat-square)](https://bundlephobia.com/package/@fab-orbita/qr)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg?style=flat-square)](https://nodejs.org)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-success?style=flat-square)](package.json)
[![Tests](https://img.shields.io/badge/tests-253-brightgreen?style=flat-square)](#testing)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen?style=flat-square)](#testing)

**40 versions · 4 error correction levels · 8 masks · 4 encoding modes · 4 renderers**

`@fab-orbita/qr` is a production-grade QR code library with **no runtime dependencies**. It runs everywhere — **Node.js, browsers, Cloudflare Workers, Deno, Bun and Vercel Edge** (see [docs/browser.md](docs/browser.md)) — produces byte-identical output to the reference `qrcode` implementation, and supports kanji mode, half-block terminal rendering, and hand-rolled PNG encoding.

---

## 📖 Table of Contents

- [Why?](#why)
- [Features](#features)
- [Comparison](#comparison)
- [Installation](#installation)
- [Quick start](#quick-start)
- [API](#api)
- [Examples](#examples)
- [Rendering previews](#rendering-previews)
- [Performance](#performance)
- [ISO/IEC 18004 compliance](#isoiec-18004-compliance)
- [Migrating from other libraries](#migrating-from-other-libraries)
- [Testing](#testing)
- [FAQ](#faq)
- [Documentation](#documentation)
- [Development](#development)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## Why?

Most QR libraries ship with **transitive dependency trees** — `qrcode` alone pulls in 3 direct + ~15 transitive packages (`pngjs`, `yargs`, `dijkstrajs`, and their dependencies). Every one of those is a potential CVE, a potential breaking change, a potential supply-chain attack vector.

`@fab-orbita/qr` reimplements **the entire ISO/IEC 18004 pipeline from scratch**:

| Component | Typical dependency | @fab-orbita/qr |
|---|---|---|
| Galois Field GF(256) | `gf256` | ✅ built-in |
| Reed–Solomon encoding | `reedsolomon` | ✅ built-in |
| PNG encoder | `pngjs` | ✅ built-in (with own CRC-32) |
| SVG renderer | templates | ✅ built-in |
| Terminal renderer | `qrcode-terminal` | ✅ built-in (half-block) |
| Kanji (Shift JIS) table | `iconv-lite` | ✅ built-in (6953 entries) |
| TypeScript types | `@types/qrcode` | ✅ bundled |

The result: **one package, zero install footprint, zero CVEs, deterministic builds**.

---

## Features

- 🎯 **Full ISO/IEC 18004** — versions 1–40, EC levels L/M/Q/H, all 8 mask patterns
- 🧠 **Automatic mask selection** — penalty scoring N1–N4 with tie-breaking to lowest index
- 🔤 **Four encoding modes** — numeric, alphanumeric, byte (UTF-8), **kanji** (Shift JIS)
- 🖼️ **Four renderers** — terminal (full + half-block), SVG, PNG, ASCII
- 📦 **Zero runtime dependencies** — Node built-ins only where needed (`node:zlib`, `node:fs/promises`); the browser build has **no `node:*` imports at all**
- 🌍 **Runs everywhere** — Node.js, browsers, Cloudflare Workers, Deno, Bun, Vercel Edge ([support matrix](docs/browser.md))
- 🔒 **Secure by design** — XML-escaped SVG colours, strict hex parser for PNG, no `eval`, no dynamic imports
- 🧪 **100% test coverage** — 250+ tests, byte-parity with `qrcode` on 1280 matrix combinations
- 🌐 **Dual ESM + CommonJS** — three entries (`default`, `/node`, `/browser`) with bundled TypeScript declarations
- ⚡ **Fast** — on par with `qrcode`, ~46 KB gzipped ESM
- 📝 **Fully documented** — API reference, compliance notes, security policy, migration guides

---

## Comparison

| Feature | **@fab-orbita/qr** | `qrcode` | `qrcode-generator` |
|---|:---:|:---:|:---:|
| Runtime dependencies | **0** | 3 (+ transitive) | 0 |
| TypeScript types | bundled | `@types/qrcode` | — |
| Versions | 1–40 | 1–40 | 1–40 |
| EC levels | L/M/Q/H | L/M/Q/H | L/M/Q/H |
| Masks | 8 + auto | 8 + auto | 8 |
| Numeric mode | ✅ | ✅ | ✅ |
| Alphanumeric mode | ✅ | ✅ | ✅ |
| Byte mode (UTF-8) | ✅ | ✅ | ✅ |
| **Kanji mode** | ✅ built-in | ⚠️ requires `toSJISFunc` | ❌ |
| PNG renderer | ✅ zero-dep | ✅ (via `pngjs`) | ❌ |
| SVG renderer | ✅ | ✅ | ✅ |
| Terminal renderer | ✅ half-block | ⚠️ via `toString({type:'terminal'})` | ❌ |
| ASCII renderer | ✅ | ❌ | ❌ |
| **Streaming API** | ❌ | ❌ | ❌ |
| **Zero-install footprint** | ✅ | ❌ | ✅ |
| Module format | ESM + CJS | CJS | CJS |
| License | MIT | MIT | MIT |

---

## Installation

```bash
npm install @fab-orbita/qr
```

**Requirements:**
- **Node.js ≥ 18** — or any modern browser / edge runtime (no `node:*` needed there)
- No build step, no native modules, no postinstall scripts

---

## Quick start

### ESM (recommended)

```typescript
import { generateQR, qrToTerminal, qrToSVG, qrToPNG, qrToFile } from '@fab-orbita/qr';
import { writeFileSync } from 'node:fs';

const qr = generateQR('https://example.com');

console.log(qr.version);  // e.g. 2
console.log(qr.size);     // 25
console.log(qr.mode);     // 'byte'

// Render to terminal (half-block, ~11 lines)
console.log(qrToTerminal(qr, { small: true }));

// Render to files
writeFileSync('qr.svg', qrToSVG(qr, { scale: 10, margin: 4 }));
writeFileSync('qr.png', qrToPNG(qr, { scale: 8 }));

// Or write directly with the async helper
await qrToFile(qr, 'qr.png', { scale: 8 });
```

### CommonJS

```javascript
const { generateQR, qrToASCII } = require('@fab-orbita/qr');

const qr = generateQR('12345');
console.log(qrToASCII(qr));
// 1111111011101111111
// 1000001010001000001
// 1011101011101011101
// ...
```

### Browser

```typescript
import { generateQR, qrToSVG, qrToPNG } from '@fab-orbita/qr';

const qr = generateQR('https://example.com');
document.body.innerHTML = qrToSVG(qr, { scale: 12 });

// qrToPNG is async in browsers (CompressionStream)
const bytes = await qrToPNG(qr, { scale: 8 });
const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
```

See [docs/browser.md](docs/browser.md) for the full environment support
matrix (including the Vercel Edge PNG limitation).

---

## API

### `generateQR(text, options?)`

Generates a QR code symbol.

```typescript
function generateQR(text: string, options?: QROptions): QRCode;
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `text` | `string` | — | Text to encode (UTF-8) |
| `options.ecLevel` | `'L' \| 'M' \| 'Q' \| 'H'` | `'M'` | Error correction level |
| `options.version` | `1..40` | auto | Force a specific version |
| `options.mask` | `0..7` | auto | Force a specific mask (skips penalty search) |
| `options.mode` | `'numeric' \| 'alphanumeric' \| 'byte' \| 'kanji'` | auto | Force an encoding mode |
| `options.minVersion` | `1..40` | `1` | Auto-selection lower bound |
| `options.maxVersion` | `1..40` | `40` | Auto-selection upper bound |

**Returns** a `QRCode` object:

```typescript
interface QRCode {
  modules: boolean[][];  // true = dark; modules[row][col]
  size: number;          // 4 * version + 17
  version: number;       // 1..40
  ecLevel: ECLevel;
  mask: MaskPattern;     // 0..7
  mode: Mode;
}
```

**Errors:**
- `TypeError` — `text` is not a string
- `RangeError` — an option is out of range, forced mode cannot encode `text`, no version in range fits the data

### Renderers

| Function | Signature | Output |
|---|---|---|
| `qrToTerminal` | `(qr, { small?: boolean }) => string` | Terminal art (`█ ▀ ▄` + spaces) |
| `qrToSVG` | `(qr, RenderOptions) => string` | Standalone SVG document |
| `qrToPNG` (Node) | `(qr, RenderOptions) => Buffer` | PNG buffer, **synchronous** |
| `qrToPNG` (browser) | `(qr, RenderOptions) => Promise<Uint8Array>` | PNG bytes, **async** (CompressionStream) |
| `qrToASCII` | `(qr) => string` | `1` / `0` grid |
| `qrToFile` (Node) | `(qr, path, RenderOptions) => Promise<void>` | Writes `.svg` / `.png` / `.txt` / `.ascii` |
| `qrToFile` (elsewhere) | same signature, **always throws** | use `qrToPNG`/`qrToSVG` + Blob instead |

`RenderOptions`:

| Option | Type | Default | Description |
|---|---|---|---|
| `scale` | `number` | SVG: `1`, PNG: `4` | Units per module |
| `margin` | `number` | `4` | Quiet zone width in modules |
| `dark` | `string` | `'#000000'` | Dark colour (CSS for SVG, hex for PNG) |
| `light` | `string` | `'#ffffff'` | Light colour |

---

## Examples

### URL

```typescript
const qr = generateQR('https://example.com/promo?src=qr', { ecLevel: 'M' });
await qrToFile(qr, 'promo.svg', { scale: 12 });
```

### vCard (contact)

```typescript
const vcard = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  'N:Fabricius;Vladimir;;;',
  'FN:Фабрициус Владимир Николаевич',
  'ORG:ООО ДЕВОРБИТ',
  'EMAIL:Director@devorbit.ru',
  'END:VCARD',
].join('\n');

const qr = generateQR(vcard, { ecLevel: 'Q' });  // Q protects contact data
await qrToFile(qr, 'vcard.png', { scale: 8 });
```

### Wi-Fi

```typescript
function wifiQr(ssid: string, password: string, security: 'WPA' | 'WEP' | 'nopass' = 'WPA') {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');
  const body = security === 'nopass'
    ? `WIFI:T:nopass;S:${esc(ssid)};;`
    : `WIFI:T:${security};S:${esc(ssid)};P:${esc(password)};;`;
  return generateQR(body, { ecLevel: 'H' });  // H: survives prints & glare
}

await qrToFile(wifiQr('Orbita-5G', 's3cret!pass'), 'wifi.svg', { scale: 10 });
```

### 2FA / TOTP (otpauth URI)

```typescript
const otpauth =
  'otpauth://totp/Example:admin@example.com' +
  '?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA1&digits=6&period=30';

const qr = generateQR(otpauth, { ecLevel: 'M' });
console.log(qrToTerminal(qr, { small: true }));  // paste straight into a CLI
```

### Kanji mode

```typescript
// Explicit only — kanji is never auto-detected.
const qr = generateQR('東京タワー', { mode: 'kanji', ecLevel: 'M' });
console.log(qr.mode);  // 'kanji'
console.log(qr.version);  // 1 (kanji is very compact)

// Characters outside Shift JIS throw a descriptive error:
generateQR('東京🙂', { mode: 'kanji' });
// RangeError: character U+1F642 "🙂" cannot be encoded in Kanji mode (not in Shift JIS)
```

### Terminal art in CI logs

```typescript
const qr = generateQR('https://ci.example.com/build/42');
process.stdout.write(qrToTerminal(qr, { small: true }) + '\n');
```

### Custom styling

```typescript
const dark = '#101820';
const light = '#FFFBF0';

const qr = generateQR('hello', { ecLevel: 'Q' });
const svg = qrToSVG(qr, { scale: 16, margin: 4, dark, light });
const png = qrToPNG(qr, { scale: 8, margin: 4, dark, light });
```

### Bounded versions

```typescript
// At least version 7 (e.g. to guarantee version info blocks for testing)
generateQR('hi', { minVersion: 7 });

// Never exceed version 5 — throws if the data does not fit
generateQR('hi', { maxVersion: 5, ecLevel: 'H' });
```

More recipes: [docs/examples.md](docs/examples.md).

---

## Rendering previews

### Terminal (default)

```
██████████████      ██████  ██████████████
██          ██        ██    ██          ██
██  ██████  ██  ██  ██  ██  ██  ██████  ██
██  ██████  ██  ██    ████  ██  ██████  ██
██  ██████  ██  ██████████  ██  ██████  ██
██          ██  ████    ██  ██          ██
██████████████  ██  ██  ██  ██████████████
                ██    ████
██  ██████████          ██  ██████████
...
```

### Terminal (`small: true`) — half-block

```
█▀▀▀▀▀█   ▀█▀ █▀▀▀▀▀█
█ ███ █ █ ▀▄█ █ ███ █
█ ▀▀▀ █ ██▀▀█ █ ▀▀▀ █
▀▀▀▀▀▀▀ █ ▀▄█ ▀▀▀▀▀▀▀
▀ ▀▀█▀▀▄▄▄  █ ▀█▀██▄▄
▀▀▄▄▀▀▀▀ ▄ ▀ ▀ ▄█▀  ▀
    ▀▀▀▀▄ ██▄█▄ ▀▄▀▄▄
█▀▀▀▀▀█ ▄▄▄▄█▄█▀ ▄▀ █
█ ███ █ █ ▀ █  █  █
█ ▀▀▀ █ ▀ ▄▀ ▀ ▄█ █ ▄
▀▀▀▀▀▀▀ ▀ ▀▀ ▀  ▀ ▀
```

### ASCII

```
111111100011101111111
100000100001001000001
101110101010101011101
...
```

### SVG / PNG

Standard QR images — scan with any reader.

---

## Performance

Measured with `npm run bench` — 10 000 iterations per input, after 500-iteration warm-up, Node.js v22.23.3 (Linux x64). Table below is **a single recorded run** (2026-10-08) — see [docs/performance.md](docs/performance.md) for the two-run record and caveats before drawing conclusions.

| Input | @fab-orbita/qr | `qrcode` | Comparison |
|---|---:|---:|---|
| URL (`https://example.com/test`) | 2 412 ms | 2 393 ms | `fab-qr` 0.8% slower |
| English text (44 chars) | 4 167 ms | 4 661 ms | `fab-qr` 10.6% faster |
| 40 digits | 2 336 ms | 2 195 ms | `fab-qr` 6.4% slower |

**Bundle size** (all three entries, `node scripts/analyze.mjs`):

| Artifact | Raw | Gzip | Brotli |
|---|---:|---:|---:|
| `dist/index.js` (universal, ESM) | 173.8 KB | **45.5 KB** | 41.6 KB |
| `dist/index.node.js` (Node, ESM) | 173.7 KB | **45.3 KB** | 41.5 KB |
| `dist/index.browser.js` (browser, ESM) | 173.8 KB | **45.5 KB** | 41.6 KB |

The dominant cost is the committed kanji (Unicode → Shift JIS) table (6 953
entries as a pure `Uint16Array` literal — no runtime decoding); gzip shrinks
hex literals well. CI fails if any artifact's gzip exceeds 100 KB.

Full methodology: [docs/performance.md](docs/performance.md).

---

## ISO/IEC 18004 compliance

`@fab-orbita/qr` targets **full conformity** with ISO/IEC 18004.

| Clause / feature | Status |
|---|:---:|
| Versions 1–40 (Table 1) | ✅ |
| Error correction levels L / M / Q / H | ✅ |
| EC block structure — all 160 version × level combos (Table 9) | ✅ |
| Reed–Solomon over GF(256), poly `0x11D` | ✅ |
| Block interleaving | ✅ |
| Modes: numeric, alphanumeric, byte (UTF-8), kanji (Shift JIS) | ✅ |
| Mode indicator & character count widths | ✅ |
| Terminator, bit padding, pad codewords `0xEC`/`0x11` | ✅ |
| Finder patterns + separators | ✅ |
| Alignment patterns (formula, incl. the v32 step-26 case) | ✅ |
| Timing patterns | ✅ |
| Dark module at `(4v + 9, 8)` | ✅ |
| Data placement zigzag | ✅ |
| Mask patterns 0–7 | ✅ |
| Penalty rules N1, N2, N3, N4 | ✅ |
| Automatic mask selection | ✅ |
| Format information BCH(15,5), both copies | ✅ |
| Version information BCH(18,6) for v7–40 | ✅ |
| Quiet zone | ✅ |
| Structured append, ECI, FNC1, Micro QR, rMQR | ❌ out of scope |

**Interpretation choices** (documented in [docs/compliance.md](docs/compliance.md)):
- N4 penalty pinned to `qrcode` semantics (ceil, not floor)
- N3 with light areas on both sides counts twice
- Kanji never auto-detected (ambiguous for Cyrillic/BMP)
- Byte-mode count = UTF-8 bytes (per standard)
- Empty input allowed (`qrcode` throws)

**Verification strategy:**
- 1280 matrix comparisons (v1–40 × EC × mask) against `qrcode@1.5.4` — **zero differing cells**
- Automatic version + mask parity on a fixed corpus and a 200-string seeded fuzz run
- Format/version BCH words compared for all combinations
- Reed–Solomon syndrome-zero assertion
- **End-to-end decode through OpenCV** in CI (see `.github/workflows/ci.yml`)

---

## Migrating from other libraries

### From `qrcode` (node-qrcode)

```typescript
// Before
import QRCode from 'qrcode';
await QRCode.toFile('qr.png', text, { errorCorrectionLevel: 'H', width: 300 });
const svg = await QRCode.toString(text, { type: 'svg' });

// After
import { generateQR, qrToFile, qrToSVG } from '@fab-orbita/qr';
await qrToFile(generateQR(text, { ecLevel: 'H' }), 'qr.png', { scale: 75 });
const svg = qrToSVG(generateQR(text), { scale: 8 });
```

| `qrcode` | `@fab-orbita/qr` |
|---|---|
| `errorCorrectionLevel: 'M'` | `ecLevel: 'M'` |
| `version: 5` | `version: 5` |
| `maskPattern: 3` | `mask: 3` |
| `QRCode.toDataURL` / `toBuffer` | `qrToPNG` (Buffer) |
| `QRCode.toString(text, {type:'terminal'})` | `qrToTerminal(qr, { small: true })` |
| `QRCode.create(text)` | `generateQR(text)` |
| `width` / `margin` (pixels) | `scale` + `margin` (modules) |
| callback / promise API | synchronous renderers + async `qrToFile` |

**Differences to be aware of:**
- Output is synchronous — no promises except `qrToFile`
- `modules` is `boolean[][]`, not packed `Uint8Array`
- Single mode per symbol (choose it or let auto-detect pick the best single mode)
- Empty input is allowed here (`qrcode` throws)
- Kanji works out of the box (`qrcode` requires `toSJISFunc`)

### From `qrcode-generator`

```typescript
// Before
import qrcode from 'qrcode-generator';
const qr = qrcode(0, 'M');
qr.addData('hello');
qr.make();
qr.createImgTag(4);

// After
import { generateQR, qrToSVG, qrToPNG, qrToTerminal } from '@fab-orbita/qr';
const qr = generateQR('hello', { ecLevel: 'M' });
qrToSVG(qr, { scale: 4 });
qrToPNG(qr, { scale: 4 });
qrToTerminal(qr, { small: true });
```

Full guide: [docs/migration.md](docs/migration.md).

---

## Testing

```bash
npm test              # run all tests once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

**Test suite:**
- 253 tests across 28 files
- **100% statement, branch, function, line coverage**
- Byte-parity against `qrcode@1.5.4` for all 1280 version × EC × mask combinations
- Property-based fuzzing (200 seeded random inputs)
- Round-trip tests: `generateQR` → `qrToPNG` → OpenCV decode

---

## FAQ

<details>
<summary><b>Why not just use <code>qrcode</code>?</b></summary>

`qrcode` is excellent, but it has **3 direct + ~15 transitive dependencies** (`pngjs`, `yargs`, `dijkstrajs`, etc.). Each one is a potential CVE. `@fab-orbita/qr` has **zero runtime dependencies** and reimplements everything from scratch, giving you:
- Smaller install footprint
- Deterministic builds
- No supply-chain attack surface
- Built-in kanji mode (no `toSJISFunc` injection)
- Half-block terminal rendering

</details>

<details>
<summary><b>Does it work in the browser?</b></summary>

**Yes — officially, since v1.1.0.** The package ships a dedicated browser
entry with **zero `node:*` imports** (verified in CI):

```typescript
import { generateQR, qrToSVG, qrToPNG } from '@fab-orbita/qr';
const bytes = await qrToPNG(generateQR('hello')); // async, CompressionStream
```

Works in browsers, Cloudflare Workers, Deno and Bun. On **Vercel Edge**
`qrToPNG` throws (no `CompressionStream`, no `node:zlib` there) — use
`qrToSVG` instead. Full details: [docs/browser.md](docs/browser.md).

</details>

<details>
<summary><b>How does it compare in size to <code>qrcode</code>?</b></summary>

- `@fab-orbita/qr`: **173.8 KB raw / 45.5 KB gzip** (ESM, includes the kanji table)
- `qrcode` + deps: typically **~120–200 KB** depending on tree-shaking

</details>

<details>
<summary><b>Does it support Chinese/Japanese/Korean text?</b></summary>

- **Japanese (kanji)**: ✅ native support via `mode: 'kanji'`
- **Chinese/Korean**: ⚠️ use `mode: 'byte'` (UTF-8) — auto-detected when non-alphanumeric characters are present

</details>

<details>
<summary><b>What about error correction levels?</b></summary>

- `L` — ~7% recovery
- `M` — ~15% recovery (default, best balance)
- `Q` — ~25% recovery
- `H` — ~30% recovery (best for printed/glare-prone use)

</details>

<details>
<summary><b>Can I force a specific version or mask?</b></summary>

Yes — pass `version` (1–40) and/or `mask` (0–7) to `generateQR`. Forcing `mask` skips the penalty search (faster, but may produce a lower-quality symbol).

</details>

<details>
<summary><b>Is kanji mode auto-detected?</b></summary>

**No.** Shift JIS detection is ambiguous for Cyrillic and other BMP text (e.g. `А` in Cyrillic and `ア` in katakana can have overlapping byte ranges). Pass `mode: 'kanji'` explicitly.

</details>

<details>
<summary><b>Is the output deterministic?</b></summary>

Yes. Same input + same options → byte-identical output across all platforms and Node.js versions. The kanji lookup table is committed as source (not generated at runtime), so no ICU differences.

</details>

---

## Documentation

- 📘 [**docs/api.md**](docs/api.md) — full API reference
- 🌍 [**docs/browser.md**](docs/browser.md) — browsers, edge runtimes, environment support matrix
- 🍳 [**docs/examples.md**](docs/examples.md) — practical recipes (URL, vCard, Wi-Fi, TOTP, payments)
- ✅ [**docs/compliance.md**](docs/compliance.md) — ISO/IEC 18004 compliance notes & interpretation choices
- ⚡ [**docs/performance.md**](docs/performance.md) — benchmarks & bundle size
- 🔄 [**docs/migration.md**](docs/migration.md) — migrating from `qrcode`, `qrcode-generator`, others
- 🔒 [**docs/security.md**](docs/security.md) — security policy & supply chain notes
- 🇷🇺 [**README.ru.md**](README.ru.md) — full Russian version of this README and the docs under `docs/ru/`

---

## Development

```bash
git clone https://github.com/zammartin2/qr.git
cd qr
npm install

npm run lint          # eslint, zero warnings allowed
npm run typecheck     # tsc --noEmit
npm run test:coverage # keep thresholds green
npm run build         # rm -rf dist && tsup (3 entries)
npm run test:bundle   # esbuild gates + exports/d.ts contract checks
npm run bench         # performance benchmark
npm run docs:check    # every public export must carry JSDoc
node scripts/analyze.mjs  # bundle-size gate (gzip ≤ 100 KB)
```

**Guidelines:**
- Zero runtime dependencies (Node built-ins only)
- Spec-first: reference ISO/IEC 18004 clauses in changes
- 100% test coverage required
- JSDoc on all public exports

Full guidelines: [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Security

**Report vulnerabilities to [security@devorbit.ru](mailto:security@devorbit.ru)** — do **not** open a public GitHub issue for security-sensitive reports.

- Zero runtime dependencies → **no third-party CVEs possible**
- SVG output XML-escapes colour strings (no markup injection)
- PNG output uses strict `#RGB`/`#RRGGBB` parser
- No `eval`, no dynamic imports of user data, no shell-outs

See [SECURITY.md](SECURITY.md) and [docs/security.md](docs/security.md).

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening a PR.

Quick checklist:
- [ ] Tests pass (`npm run test:coverage`)
- [ ] Lint clean (`npm run lint`)
- [ ] Type-check clean (`npm run typecheck`)
- [ ] JSDoc on public exports
- [ ] Zero new runtime dependencies

---

## License

[MIT](LICENSE) © **Фабрициус Владимир Николаевич / ООО «ДЕВОРБИТ»**

---

<div align="center">

**[⭐ Star on GitHub](https://github.com/zammartin2/qr) · [📦 View on npm](https://www.npmjs.com/package/@fab-orbita/qr) · [🐛 Report a bug](https://github.com/zammartin2/qr/issues)**
Made with ❤️ in Siberia
</div>