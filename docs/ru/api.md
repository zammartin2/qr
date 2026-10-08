# Справочник API

**English:** [../api.md](../api.md)

Все публичные экспорты `@fab-orbita/qr`.

## Entry points

| Импорт | Рантайм | `qrToPNG` | `qrToFile` |
|---|---|---|---|
| `@fab-orbita/qr` в Node/Deno/Bun (через условия `node`/`deno`/`bun`) | Node-подобный | **синхронно → `Buffer`** | настоящий |
| `@fab-orbita/qr` в браузерных бандлерах (через `browser`/`workerd`/`edge-*`) | браузерный | **асинхронно → `Promise<Uint8Array>`** | стаб (бросает) |
| `@fab-orbita/qr` (default-фоллбэк) | универсальный | асинхронно → `Promise<Uint8Array>` | стаб (бросает) |
| `@fab-orbita/qr/node` | Node / Deno / Bun | синхронно → `Buffer` | настоящий |
| `@fab-orbita/qr/browser` | браузер / Workers / Edge | асинхронно → `Promise<Uint8Array>` | стаб (бросает) |

Матрица поддержки окружений: [browser.md](../ru/browser.md).

## Типы

```typescript
type ECLevel = 'L' | 'M' | 'Q' | 'H';
type Mode = 'numeric' | 'alphanumeric' | 'byte' | 'kanji';
type MaskPattern = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface QROptions {
  ecLevel?: ECLevel;      // по умолчанию 'M'
  version?: number;       // 1-40, фиксация версии
  mask?: MaskPattern;     // 0-7, фиксация маски
  mode?: Mode;            // фиксация режима кодирования
  minVersion?: number;    // нижняя граница автовыбора версии
  maxVersion?: number;    // верхняя граница автовыбора версии
}

interface QRCode {
  modules: boolean[][];   // true = тёмный; modules[row][col]
  size: number;           // 4 * version + 17
  version: number;        // 1-40
  ecLevel: ECLevel;
  mask: MaskPattern;
  mode: Mode;
}

interface RenderOptions {
  scale?: number;         // SVG: по умолчанию 1; PNG: 4
  margin?: number;        // тихая зона в модулях, по умолчанию 4
  dark?: string;          // '#000000' (PNG принимает #RGB / #RRGGBB)
  light?: string;         // '#ffffff'
}
```

## generateQR

```typescript
function generateQR(text: string, options?: QROptions): QRCode;
```

Генерирует символ QR-кода.

| Параметр | Тип | По умолчанию | Описание |
|---|---|---|---|
| `text` | `string` | — | Текст для кодирования (UTF-8) |
| `options.ecLevel` | `ECLevel` | `'M'` | Уровень коррекции ошибок |
| `options.version` | `number` | авто | Фиксация версии 1–40 |
| `options.mask` | `MaskPattern` | авто | Фиксация маски 0–7 (пропускает поиск по штрафу) |
| `options.mode` | `Mode` | авто | Фиксация режима кодирования |
| `options.minVersion` | `number` | `1` | Нижняя граница автовыбора |
| `options.maxVersion` | `number` | `40` | Верхняя граница автовыбора |

**Автоопределение режима** (когда `options.mode` не задан): только цифры →
`numeric`; символы из подмножества ISO/IEC 646
`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:` → `alphanumeric`; всё
остальное (включая пустую строку) → `byte`.

Kanji **никогда** не определяется автоматически — определение Shift JIS
неоднозначно для кириллицы и другого BMP-текста. Передавайте
`mode: 'kanji'` явно.

**Ошибки**

- `TypeError` — `text` не строка.
- `RangeError` — опция вне диапазона; `minVersion > maxVersion`; форсированный
  `mode` не может закодировать `text`; ни одна версия в диапазоне не вмещает
  данные; форсированная `version` слишком мала для данных.

**Пример**

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

Рендерит строку для терминала (без ANSI-кодов, без завершающего перевода
строки).

- По умолчанию: два символа на модуль (`██` тёмный, пробелы светлый) —
  корректное соотношение 1:1 в моноширинных шрифтах.
- `small: true`: две строки модулей в одну текстовую строку символами
  `█`, `▀`, `▄` и пробел; при нечётной высоте недостающая строка
  дополняется светлыми модулями.

```typescript
console.log(qrToTerminal(qr));
console.log(qrToTerminal(qr, { small: true }));
```

## qrToSVG

```typescript
function qrToSVG(qr: QRCode, options?: RenderOptions): string;
```

Рендерит самодостаточный SVG-документ. `viewBox` — в модульных единицах
(`size + 2 * margin`); `width`/`height` умножены на `scale`. Тёмные модули
объединены в один `<path>`; цвета XML-эскейпятся.

| Опция | По умолчанию | Описание |
|---|---|---|
| `scale` | `1` | Целочисленный множитель ≥ 0 |
| `margin` | `4` | Тихая зона в модулях |
| `dark` | `'#000000'` | Цвет тёмных модулей |
| `light` | `'#ffffff'` | Цвет фона |

`RangeError` для отрицательных/дробных `scale` или `margin`.

```typescript
const svg = qrToSVG(qr, { scale: 10, margin: 4, dark: '#101820' });
```

## qrToPNG

```typescript
// Node-entry (@fab-orbita/qr/node, или "." в Node.js):
function qrToPNG(qr: QRCode, options?: RenderOptions): Buffer;

// Browser / universal entry:
function qrToPNG(qr: QRCode, options?: RenderOptions): Promise<Uint8Array>;
```

Рендерит PNG: 8-битная индексированная палитра (запись 0 = тёмный, 1 =
светлый), фильтр 0, собственный CRC-32. Сжатие зависит от entry:

- **Node** — `node:zlib` `deflateSync`, **синхронно**;
- **Браузер / edge** — `CompressionStream('deflate')`, **асинхронно**. Если
  в рантайме нет `CompressionStream` (например, Vercel Edge Functions),
  бросается понятная ошибка со ссылкой на этот документ.

Пиксельный вывод у обеих реализаций идентичен.

| Опция | По умолчанию | Описание |
|---|---|---|
| `scale` | `4` | Пикселей на модуль |
| `margin` | `4` | Тихая зона в модулях |
| `dark` | `'#000000'` | `#RGB` или `#RRGGBB` |
| `light` | `'#ffffff'` | `#RGB` или `#RRGGBB` |

`RangeError` при неверной геометрии или не-hex цвете.

```typescript
// Node.js
writeFileSync('qr.png', qrToPNG(qr, { scale: 8, dark: '#123456' }));

// Браузер
const bytes = await qrToPNG(qr, { scale: 8 });
const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
```

## qrToASCII

```typescript
function qrToASCII(qr: QRCode): string;
```

Рендерит ASCII-арт: `1` — тёмный, `0` — светлый; `size` строк, без
завершающего перевода строки.

```typescript
console.log(qrToASCII(qr));
```

## qrToFile

```typescript
function qrToFile(qr: QRCode, path: string, options?: RenderOptions): Promise<void>;
```

**Только Node.js** (`@fab-orbita/qr/node` или `"."` в Node). Записывает
символ на диск. Формат по расширению: `.svg`, `.png`, `.txt` / `.ascii`.
Любое другое расширение (или не строковый путь) отклоняется с
`RangeError` / `TypeError`.

В браузерах и прочих не-Node рантаймах **та же сигнатура** существует, но
всегда отклоняется с понятной ошибкой, называющей сабпуть
`@fab-orbita/qr/node` — используйте `qrToPNG`/`qrToSVG` + `Blob`/data URL.

```typescript
await qrToFile(qr, 'qr.svg');
await qrToFile(qr, 'qr.png');
```
