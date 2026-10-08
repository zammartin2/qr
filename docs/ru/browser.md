# Поддержка браузеров и edge-рантаймов

**English:** [../browser.md](../browser.md)

Начиная с v1.1.0 `@fab-orbita/qr` работает в браузерах, Cloudflare Workers,
Deno Deploy, Bun и Vercel Edge — не только в Node.js.

## Быстрый старт (браузер)

```typescript
import { generateQR, qrToSVG, qrToPNG } from '@fab-orbita/qr';
// или явно:
import { generateQR, qrToSVG, qrToPNG } from '@fab-orbita/qr/browser';

const qr = generateQR('https://example.com');

// SVG — синхронная строка, работает везде
document.body.innerHTML = qrToSVG(qr, { scale: 12 });

// PNG — АСИНХРОННО (CompressionStream)
const pngBytes = await qrToPNG(qr, { scale: 8 });
const url = URL.createObjectURL(new Blob([pngBytes], { type: 'image/png' }));
```

В бандлерах (Vite, Webpack, esbuild, Rollup) условие экспорта `"browser"`
автоматически выбирает `dist/index.browser.js` — **без шимов, без
полифиллов, ноль рантайм-зависимостей**.

## Entry points

| Субпуть | Куда резолвится | `qrToPNG` | `qrToFile` |
|---|---|---|---|
| `@fab-orbita/qr` (Node) | `index.node` (через условие `node`) | **синхронно → `Buffer`** | настоящий (пишет файлы) |
| `@fab-orbita/qr` (браузерные бандлеры) | `index.browser` (через условие `browser`) | **асинхронно → `Uint8Array`** | стаб (бросает) |
| `@fab-orbita/qr` (без условий) | `index` (default-фоллбэк) | асинхронно → `Uint8Array` | стаб (бросает) |
| `@fab-orbita/qr/node` | `index.node` | синхронно → `Buffer` | настоящий |
| `@fab-orbita/qr/browser` | `index.browser` | асинхронно → `Uint8Array` | стаб (бросает) |

Условия экспорта (в порядке приоритета): `bun`, `workerd`, `edge-light`,
`edge-runtime`, `deno`, `browser`, `node`, `default`.

## Матрица поддержки окружений

| Окружение | generateQR | qrToSVG | qrToPNG | qrToFile |
|---|:---:|:---:|:---:|:---:|
| Node.js ≥ 18 | ✅ | ✅ | ✅ синхронно `Buffer` | ✅ |
| Bun | ✅ | ✅ | ✅ синхронно `Buffer` | ✅ |
| Браузер | ✅ | ✅ | ✅ асинхронно | ❌ бросает (стаб) |
| Cloudflare Workers | ✅ | ✅ | ✅ асинхронно | ❌ бросает (стаб) |
| Deno Deploy | ✅ | ✅ | асинхронно ✅ | ✅ |
| **Vercel Edge** | ✅ | ✅ | **❌ бросает** | ❌ бросает (стаб) |

## Vercel Edge — известное ограничение

Vercel Edge Functions **не предоставляют**:

- `CompressionStream` (Web Streams compression API), или
- `node:zlib` (Node.js compatibility module).

Сжать данные для PNG там просто нечем. Итог: `qrToPNG` бросает понятную
ошибку. Альтернативы:

- используйте **`qrToSVG`** — работает везде, сжатие не нужно;
- деплойтесь на **Node.js runtime** вместо Edge;
- деплойтесь на **Cloudflare Workers** — там `CompressionStream` есть
  (`qrToPNG` работает из коробки).

То же относится к любому рантайму без `CompressionStream`.

## TypeScript

Стандартные условия экспорта дают Node-потребителям синхронный контракт.
Для **браузерных типов** при `moduleResolution: "bundler"` добавьте условие
браузера в `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "customConditions": ["browser"]
  }
}
```

…либо импортируйте явный сабпуть, которому условия не нужны вообще:

```typescript
import { qrToPNG } from '@fab-orbita/qr/browser'; // Promise<Uint8Array>
```

## Старые бандлеры без поддержки `exports`

Webpack 4 и другие инструменты, читающие только `main`/`module`, получают
**универсальный** entry (асинхронный PNG, бросающий `qrToFile`). В Node.js с
такими инструментами импортируйте node-сабпуть явно:

```typescript
import { qrToFile, qrToPNG } from '@fab-orbita/qr/node';
```

## Тексты ошибок

Все ошибки библиотеки — на английском и там, где уместно, ссылаются на этот
документ (`See docs/browser.md.`), в том числе:

- feature-detect ошибка `qrToPNG` (нет `CompressionStream`);
- стаб `qrToFile` (доступен только в Node.js).

## Как это устроено

- **Universal- и browser-entry не содержат импортов `node:*` вообще** —
  проверяется в CI сборкой через esbuild (`--platform=browser` падает на
  любом `node:*`-спецификаторе) — см. `scripts/smoke-bundle.mjs`.
- PNG-кодирование разделено: общий код сканлайнов/CRC/чанков
  (`src/render/png/shared.ts`), сжатие через `node:zlib` (node-entry) или
  `CompressionStream('deflate')` (browser-entry). Оба дают корректный zlib
  (RFC 1950) для чанка IDAT — пиксельный вывод идентичен.
- Таблица kanji — чистый литерал `Uint16Array` — без `Buffer` и base64.
