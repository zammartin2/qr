# Browser & edge runtime support

**Русская версия:** [ru/browser.md](ru/browser.md)

Since v1.1.0 `@fab-orbita/qr` runs in browsers, Cloudflare Workers, Deno Deploy, Bun and Vercel Edge — not only in Node.js.

## Quick start (browser)

```typescript
import { generateQR, qrToSVG, qrToPNG } from '@fab-orbita/qr';
// or, explicitly:
import { generateQR, qrToSVG, qrToPNG } from '@fab-orbita/qr/browser';

const qr = generateQR('https://example.com');

// SVG — synchronous string, works everywhere
document.body.innerHTML = qrToSVG(qr, { scale: 12 });

// PNG — ASYNC (CompressionStream)
const pngBytes = await qrToPNG(qr, { scale: 8 });
const url = URL.createObjectURL(new Blob([pngBytes], { type: 'image/png' }));
```

The same import specifier (`@fab-orbita/qr`) resolves differently depending on the bundler's conditions: under `browser` you get `index.browser.js`, where `qrToPNG` is async and returns `Uint8Array`. Under `node` you get `index.node.js`, where `qrToPNG` is sync and returns `Buffer`.

With bundlers (Vite, Webpack, esbuild, Rollup) the `browser` export condition picks `dist/index.browser.js` automatically — no shims, no polyfills, zero runtime dependencies.

## Entry points

| Subpath | Resolves to | `qrToPNG` | `qrToFile` |
|---|---|---|---|
| `@fab-orbita/qr` (Node) | `index.node` (via `node` condition) | sync → `Buffer` | real (writes files) |
| `@fab-orbita/qr` (browser bundlers) | `index.browser` (via `browser` condition) | async → `Uint8Array` | stub (throws) |
| `@fab-orbita/qr` (no conditions) | `index` (default fallback) | async → `Uint8Array` | stub (throws) |
| `@fab-orbita/qr/node` | `index.node` | sync → `Buffer` | real |
| `@fab-orbita/qr/browser` | `index.browser` | async → `Uint8Array` | stub (throws) |

Export conditions (in priority order): `bun`, `workerd`, `edge-light`, `edge-runtime`, `deno`, `browser`, `node`, `default`.

Conditions are evaluated top-to-bottom and the first match wins. Note that `browser` precedes `node`, so a tool that sets both resolves to the browser entry.

## Environment support matrix

| Environment | `generateQR` | `qrToSVG` | `qrToPNG` | `qrToFile` |
|---|---|---|---|---|
| Node.js ≥ 18 | ✅ | ✅ | ✅ sync `Buffer` | ✅ |
| Bun | ✅ | ✅ | ✅ sync `Buffer` | ✅ |
| Browser | ✅ | ✅ | ✅ async | ❌ throws (stub) |
| Cloudflare Workers | ✅ | ✅ | ✅ async | ❌ throws (stub) |
| Deno (full runtime) | ✅ | ✅ | ✅ async | ✅ |
| Deno Deploy | ✅ | ✅ | ✅ async | ❌ throws (stub) |
| Vercel Edge | ✅ | ✅ | ❌ throws | ❌ throws (stub) |

## Vercel Edge — known limitation

Vercel Edge Functions do not provide:

- `CompressionStream` (Web Streams compression API), or
- `node:zlib` (Node.js compatibility module).

There is no way to deflate PNG data there. Result: `qrToPNG` throws a descriptive error. Alternatives:

- use `qrToSVG` — works everywhere, no compression needed;
- deploy to the Node.js runtime instead of Edge;
- deploy to Cloudflare Workers — `CompressionStream` is available there (`qrToPNG` works out of the box).

The same applies to any runtime without `CompressionStream`.

## TypeScript

The default export conditions give Node consumers the synchronous contract. For browser-specific types under `moduleResolution: "bundler"` add the browser condition in `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "customConditions": ["browser"]
  }
}
```

This applies to the whole project — in a mixed Node + browser codebase it switches the types of every `@fab-orbita/qr` import. Prefer the explicit subpath there:

```typescript
import { qrToPNG } from '@fab-orbita/qr/browser'; // Promise<Uint8Array>
```

## Older bundlers that ignore `exports`

Webpack 4 and other tools that only read `main`/`module` get the universal entry. That means:

- `qrToPNG` returns a `Promise<Uint8Array>` (not a sync `Buffer`);
- `qrToFile` throws at runtime.

If you need the v1.0 synchronous contract on such a toolchain, import the node subpath explicitly:

```typescript
import { qrToFile, qrToPNG } from '@fab-orbita/qr/node';
```

## Troubleshooting

- **`qrToPNG` throws “CompressionStream is not available” in a modern browser.** Check that your bundler did not resolve the node entry. Import from `@fab-orbita/qr/browser` explicitly to force the browser build.
- **`qrToFile` is only available in Node.js.** Expected in browsers, Workers, Deno Deploy and Vercel Edge. Use `qrToPNG`/`qrToSVG` + `Blob` or a data URL instead.
- **Types say `Buffer`, runtime returns `Uint8Array`.** Your `tsconfig` resolved the node types. Add `customConditions: ["browser"]` or import from `@fab-orbita/qr/browser`.
- **`qrToPNG` throws on Vercel Edge.** There is no `CompressionStream` there — see above.

## Error messages

All library errors are in English and reference this document where relevant (`See docs/browser.md.`), including:

- the `qrToPNG` feature-detect error (missing `CompressionStream`);
- the `qrToFile` stub (available only in Node.js).

## How it works

Universal and browser entries contain zero `node:*` imports — verified in CI by bundling them with esbuild (`--platform=browser` fails on any `node:*` specifier) — see `scripts/smoke-bundle.mjs`.

PNG encoding is split: shared scanline/CRC/chunk code (`src/render/png/shared.ts`), compression via `node:zlib` (Node entry) or `CompressionStream('deflate')` (browser entry). Both produce valid zlib (RFC 1950) streams for the PNG `IDAT` chunk — pixel output is identical, verified by the browser/Node parity test.

The kanji table is a plain `Uint16Array` literal — no `Buffer`, no base64.

For the full public API, see [api.md](api.md).
