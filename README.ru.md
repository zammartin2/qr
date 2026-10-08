# @fab-orbita/qr

> **QR-генератор без зависимостей с полным соответствием ISO/IEC 18004.**

[🇺🇸 English version](README.md)

[![npm version](https://img.shields.io/npm/v/@fab-orbita/qr.svg?style=flat-square)](https://www.npmjs.com/package/@fab-orbita/qr)
[![npm downloads](https://img.shields.io/npm/dm/@fab-orbita/qr.svg?style=flat-square)](https://www.npmjs.com/package/@fab-orbita/qr)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@fab-orbita/qr?style=flat-square)](https://bundlephobia.com/package/@fab-orbita/qr)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg?style=flat-square)](https://nodejs.org)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-success?style=flat-square)](package.json)
[![Tests](https://img.shields.io/badge/tests-253-brightgreen?style=flat-square)](#тестирование)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen?style=flat-square)](#тестирование)

**40 версий · 4 уровня коррекции ошибок · 8 масок · 4 режима кодирования · 4 рендерера**

`@fab-orbita/qr` — библиотека QR-кодов уровня production **без рантайм-зависимостей**. Работает везде — **Node.js, браузерах, Cloudflare Workers, Deno, Bun и Vercel Edge** (см. [docs/ru/browser.md](docs/ru/browser.md)) — обеспечивает побайтовую идентичность с эталонной реализацией `qrcode` и поддерживает режим kanji, полублочный вывод в терминал и собственный PNG-энкодер.

---

## 📖 Содержание

- [Зачем?](#зачем)
- [Возможности](#возможности)
- [Сравнение](#сравнение)
- [Установка](#установка)
- [Быстрый старт](#быстрый-старт)
- [API](#api)
- [Примеры](#примеры)
- [Превью рендеринга](#превью-рендеринга)
- [Производительность](#производительность)
- [Соответствие ISO/IEC 18004](#соответствие-isoiec-18004)
- [Миграция с других библиотек](#миграция-с-других-библиотек)
- [Тестирование](#тестирование)
- [FAQ](#faq)
- [Документация](#документация)
- [Разработка](#разработка)
- [Безопасность](#безопасность)
- [Участие](#участие)
- [Лицензия](#лицензия)

---

## Зачем?

Большинство QR-библиотек тянут за собой **дерево транзитивных зависимостей** — у одного только `qrcode` 3 прямых + ~15 транзитивных пакетов (`pngjs`, `yargs`, `dijkstrajs` и их зависимости). Каждая — потенциальный CVE, потенциальный ломающий апдейт, потенциальная атака через supply chain.

`@fab-orbita/qr` реализует **весь конвейер ISO/IEC 18004 с нуля**:

| Компонент | Типичная зависимость | @fab-orbita/qr |
|---|---|---|
| Поле Галуа GF(256) | `gf256` | ✅ встроен |
| Кодирование Рида — Соломона | `reedsolomon` | ✅ встроен |
| PNG-энкодер | `pngjs` | ✅ встроен (собственный CRC-32) |
| SVG-рендерер | шаблоны | ✅ встроен |
| Терминальный рендерер | `qrcode-terminal` | ✅ встроен (полублоки) |
| Таблица kanji (Shift JIS) | `iconv-lite` | ✅ встроен (6953 записи) |
| Типы TypeScript | `@types/qrcode` | ✅ в комплекте |

Результат: **один пакет, нулевой footprint установки, ноль CVE, детерминированные сборки**.

---

## Возможности

- 🎯 **Полное соответствие ISO/IEC 18004** — версии 1–40, уровни L/M/Q/H, все 8 масок
- 🧠 **Автовыбор маски** — штрафные баллы N1–N4 с приоритетом меньшего индекса при равенстве
- 🔤 **Четыре режима кодирования** — numeric, alphanumeric, byte (UTF-8), **kanji** (Shift JIS)
- 🖼️ **Четыре рендерера** — терминал (обычный + полублоки), SVG, PNG, ASCII
- 📦 **Ноль рантайм-зависимостей** — только `node:zlib` и `node:fs/promises` там, где они нужны; в браузерной сборке **вообще нет импортов `node:*`**
- 🌍 **Работает везде** — Node.js, браузеры, Cloudflare Workers, Deno, Bun, Vercel Edge ([матрица поддержки](docs/ru/browser.md))
- 🔒 **Безопасность по умолчанию** — XML-эскейп цветов в SVG, строгий hex-парсер для PNG, без `eval`, без динамических импортов
- 🧪 **Покрытие 100%** — 253 теста, побайтовый паритет с `qrcode` на 1280 комбинациях матриц
- 🌐 **Двойной ESM + CommonJS** — три entry (`default`, `/node`, `/browser`) со встроенными объявлениями TypeScript
- ⚡ **Быстро** — на уровне `qrcode`, ~46 КБ gzipped ESM
- 📝 **Полная документация** — справочник API, заметки о соответствии, политика безопасности, гайды по миграции

---

## Сравнение

| Возможность | **@fab-orbita/qr** | `qrcode` | `qrcode-generator` |
|---|:---:|:---:|:---:|
| Рантайм-зависимости | **0** | 3 (+ транзитивные) | 0 |
| Типы TypeScript | в комплекте | `@types/qrcode` | — |
| Версии | 1–40 | 1–40 | 1–40 |
| Уровни EC | L/M/Q/H | L/M/Q/H | L/M/Q/H |
| Маски | 8 + авто | 8 + авто | 8 |
| Numeric режим | ✅ | ✅ | ✅ |
| Alphanumeric режим | ✅ | ✅ | ✅ |
| Byte режим (UTF-8) | ✅ | ✅ | ✅ |
| **Режим kanji** | ✅ встроен | ⚠️ нужен `toSJISFunc` | ❌ |
| PNG-рендерер | ✅ без зависимостей | ✅ (через `pngjs`) | ❌ |
| SVG-рендерер | ✅ | ✅ | ✅ |
| Терминальный рендерер | ✅ полублоки | ⚠️ через `toString({type:'terminal'})` | ❌ |
| ASCII-рендерер | ✅ | ❌ | ❌ |
| **Streaming API** | ❌ | ❌ | ❌ |
| **Нулевой footprint установки** | ✅ | ❌ | ✅ |
| Формат модулей | ESM + CJS | CJS | CJS |
| Лицензия | MIT | MIT | MIT |

---

## Установка

```bash
npm install @fab-orbita/qr
```

**Требования:**
- **Node.js ≥ 18** — либо любой современный браузер / edge-рантайм (там `node:*` не нужны)
- Без шага сборки, без нативных модулей, без postinstall-скриптов

---

## Быстрый старт

### ESM (рекомендуется)

```typescript
import { generateQR, qrToTerminal, qrToSVG, qrToPNG, qrToFile } from '@fab-orbita/qr';
import { writeFileSync } from 'node:fs';

const qr = generateQR('https://example.com');

console.log(qr.version);  // например, 2
console.log(qr.size);     // 25
console.log(qr.mode);     // 'byte'

// Вывод в терминал (полублоки, ~11 строк)
console.log(qrToTerminal(qr, { small: true }));

// Рендер в файлы
writeFileSync('qr.svg', qrToSVG(qr, { scale: 10, margin: 4 }));
writeFileSync('qr.png', qrToPNG(qr, { scale: 8 }));

// Или запись асинхронным хелпером
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

### Браузер

```typescript
import { generateQR, qrToSVG, qrToPNG } from '@fab-orbita/qr';

const qr = generateQR('https://example.com');
document.body.innerHTML = qrToSVG(qr, { scale: 12 });

// В браузерах qrToPNG асинхронный (CompressionStream)
const bytes = await qrToPNG(qr, { scale: 8 });
const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
```

Полная матрица поддержки окружений (включая ограничение PNG на Vercel Edge):
[docs/ru/browser.md](docs/ru/browser.md).

---

## API

### `generateQR(text, options?)`

Генерирует символ QR-кода.

```typescript
function generateQR(text: string, options?: QROptions): QRCode;
```

| Параметр | Тип | По умолчанию | Описание |
|---|---|---|---|
| `text` | `string` | — | Текст для кодирования (UTF-8) |
| `options.ecLevel` | `'L' \| 'M' \| 'Q' \| 'H'` | `'M'` | Уровень коррекции ошибок |
| `options.version` | `1..40` | авто | Фиксация конкретной версии |
| `options.mask` | `0..7` | авто | Фиксация конкретной маски (без поиска по штрафу) |
| `options.mode` | `'numeric' \| 'alphanumeric' \| 'byte' \| 'kanji'` | авто | Фиксация режима кодирования |
| `options.minVersion` | `1..40` | `1` | Нижняя граница автовыбора |
| `options.maxVersion` | `1..40` | `40` | Верхняя граница автовыбора |

**Возвращает** объект `QRCode`:

```typescript
interface QRCode {
  modules: boolean[][];  // true = тёмный; modules[row][col]
  size: number;          // 4 * version + 17
  version: number;       // 1..40
  ecLevel: ECLevel;
  mask: MaskPattern;     // 0..7
  mode: Mode;
}
```

**Ошибки:**
- `TypeError` — `text` не строка
- `RangeError` — опция вне диапазона, форсированный режим не может закодировать `text`, ни одна версия в диапазоне не вмещает данные

### Рендереры

| Функция | Сигнатура | Результат |
|---|---|---|
| `qrToTerminal` | `(qr, { small?: boolean }) => string` | Терминальный арт (`█ ▀ ▄` + пробелы) |
| `qrToSVG` | `(qr, RenderOptions) => string` | Самодостаточный SVG-документ |
| `qrToPNG` (Node) | `(qr, RenderOptions) => Buffer` | PNG-буфер, **синхронно** |
| `qrToPNG` (браузер) | `(qr, RenderOptions) => Promise<Uint8Array>` | PNG-байты, **асинхронно** (CompressionStream) |
| `qrToASCII` | `(qr) => string` | Сетка из `1` / `0` |
| `qrToFile` (Node) | `(qr, path, RenderOptions) => Promise<void>` | Записывает `.svg` / `.png` / `.txt` / `.ascii` |
| `qrToFile` (прочие) | та же сигнатура, **всегда бросает** | используйте `qrToPNG`/`qrToSVG` + Blob |

`RenderOptions`:

| Опция | Тип | По умолчанию | Описание |
|---|---|---|---|
| `scale` | `number` | SVG: `1`, PNG: `4` | Единиц на модуль |
| `margin` | `number` | `4` | Ширина тихой зоны в модулях |
| `dark` | `string` | `'#000000'` | Цвет тёмных модулей (CSS для SVG, hex для PNG) |
| `light` | `string` | `'#ffffff'` | Цвет светлых модулей |

---

## Примеры

### URL

```typescript
const qr = generateQR('https://example.com/promo?src=qr', { ecLevel: 'M' });
await qrToFile(qr, 'promo.svg', { scale: 12 });
```

### vCard (контакты)

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

const qr = generateQR(vcard, { ecLevel: 'Q' });  // Q защищает контактные данные
await qrToFile(qr, 'vcard.png', { scale: 8 });
```

### Wi-Fi

```typescript
function wifiQr(ssid: string, password: string, security: 'WPA' | 'WEP' | 'nopass' = 'WPA') {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');
  const body = security === 'nopass'
    ? `WIFI:T:nopass;S:${esc(ssid)};;`
    : `WIFI:T:${security};S:${esc(ssid)};P:${esc(password)};;`;
  return generateQR(body, { ecLevel: 'H' });  // H: переживает печать и блики
}

await qrToFile(wifiQr('Orbita-5G', 's3cret!pass'), 'wifi.svg', { scale: 10 });
```

### 2FA / TOTP (otpauth URI)

```typescript
const otpauth =
  'otpauth://totp/Example:admin@example.com' +
  '?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA1&digits=6&period=30';

const qr = generateQR(otpauth, { ecLevel: 'M' });
console.log(qrToTerminal(qr, { small: true }));  // можно сразу вставить в CLI
```

### Режим kanji

```typescript
// Только явно — kanji никогда не определяется автоматически.
const qr = generateQR('東京タワー', { mode: 'kanji', ecLevel: 'M' });
console.log(qr.mode);  // 'kanji'
console.log(qr.version);  // 1 (kanji очень компактен)

// Символы вне Shift JIS вызывают понятную ошибку:
generateQR('東京🙂', { mode: 'kanji' });
// RangeError: character U+1F642 "🙂" cannot be encoded in Kanji mode (not in Shift JIS)
```

### Терминальный арт в логах CI

```typescript
const qr = generateQR('https://ci.example.com/build/42');
process.stdout.write(qrToTerminal(qr, { small: true }) + '\n');
```

### Кастомные стили

```typescript
const dark = '#101820';
const light = '#FFFBF0';

const qr = generateQR('hello', { ecLevel: 'Q' });
const svg = qrToSVG(qr, { scale: 16, margin: 4, dark, light });
const png = qrToPNG(qr, { scale: 8, margin: 4, dark, light });
```

### Ограниченные версии

```typescript
// Как минимум версия 7 (например, чтобы гарантировать блоки version info в тестах)
generateQR('hi', { minVersion: 7 });

// Никогда не выше версии 5 — бросит ошибку, если данные не влезают
generateQR('hi', { maxVersion: 5, ecLevel: 'H' });
```

Больше рецептов: [docs/ru/examples.md](docs/ru/examples.md).

---

## Превью рендеринга

### Терминал (по умолчанию)

```
██████████████      ██████  ███████████████
██          ██        ██    ██          ██
██  ██████  ██  ██  ██  ██  ██  ██████  ██
██  ██████  ██  ██    ████  ██  ██████  ██
██  ██████  ██  ██████████  ██  ██████  ██
██          ██  ████    ██  ██          ██
██████████████  ██  ██  ██  ███████████████
                ██    ████
██  ██████████          ██  ██████████
...
```

### Терминал (`small: true`) — полублоки

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

Стандартные изображения QR — сканируются любым считывателем.

---

## Производительность

Замер `npm run bench` — 10 000 итераций на вход после прогрева в 500 итераций, Node.js v22.23.3 (Linux x64). Таблица ниже — **один записанный прогон** (2026-10-08) — см. [docs/ru/performance.md](docs/ru/performance.md): запись из двух прогонов и оговорки, прежде чем делать выводы.

| Вход | @fab-orbita/qr | `qrcode` | Сравнение |
|---|---:|---:|---|
| URL (`https://example.com/test`) | 2 412 мс | 2 393 мс | `fab-qr` на 0,8% медленнее |
| Английский текст (44 символа) | 4 167 мс | 4 661 мс | `fab-qr` на 10,6% быстрее |
| 40 цифр | 2 336 мс | 2 195 мс | `fab-qr` на 6,4% медленнее |

**Размер бандла** (все три entry, `node scripts/analyze.mjs`):

| Артефакт | Raw | Gzip | Brotli |
|---|---:|---:|---:|
| `dist/index.js` (универсальный, ESM) | 173.8 KB | **45.5 KB** | 41.6 KB |
| `dist/index.node.js` (Node, ESM) | 173.7 KB | **45.3 KB** | 41.5 KB |
| `dist/index.browser.js` (браузер, ESM) | 173.8 KB | **45.5 KB** | 41.6 KB |

Основная часть размера — закоммиченная таблица kanji (Unicode → Shift JIS, 6953
записи в виде чистого литерала `Uint16Array`, без рантайм-декодирования);
hex-литералы хорошо сжимаются gzip. CI падает, если gzip любого артефакта превысит 100 КБ.

Полная методология: [docs/ru/performance.md](docs/ru/performance.md).

---

## Соответствие ISO/IEC 18004

`@fab-orbita/qr` нацелен на **полное соответствие** ISO/IEC 18004.

| Раздел / возможность | Статус |
|---|:---:|
| Версии 1–40 (Таблица 1) | ✅ |
| Уровни коррекции ошибок L / M / Q / H | ✅ |
| Структура EC-блоков — все 160 комбинаций (Таблица 9) | ✅ |
| Рид — Соломон над GF(256), полином `0x11D` | ✅ |
| Чередование блоков | ✅ |
| Режимы: numeric, alphanumeric, byte (UTF-8), kanji (Shift JIS) | ✅ |
| Индикатор режима и ширины счётчика символов | ✅ |
| Терминатор, битовый padding, pad-кодворды `0xEC`/`0x11` | ✅ |
| Finder-паттерны + разделители | ✅ |
| Alignment-паттерны (формула, включая случай v32 со шагом 26) | ✅ |
| Timing-паттерны | ✅ |
| Тёмный модуль в `(4v + 9, 8)` | ✅ |
| Зигзагоидная раскладка данных | ✅ |
| Маски 0–7 | ✅ |
| Штрафные правила N1, N2, N3, N4 | ✅ |
| Автовыбор маски | ✅ |
| Format information BCH(15,5), обе копии | ✅ |
| Version information BCH(18,6) для v7–40 | ✅ |
| Тихая зона | ✅ |
| Structured append, ECI, FNC1, Micro QR, rMQR | ❌ вне области |

**Интерпретационные решения** (документированы в [docs/ru/compliance.md](docs/ru/compliance.md)):
- N4-штраф зафиксирован за семантикой `qrcode` (ceil, не floor)
- N3 со светлыми зонами с обеих сторон считается дважды
- Kanji никогда не определяется автоматически (неоднозначно для кириллицы/BMP)
- Счётчик byte-режима = байты UTF-8 (по стандарту)
- Пустой вход разрешён (`qrcode` бросает ошибку)

**Стратегия верификации:**
- 1280 сравнений матриц (v1–40 × EC × маска) с `qrcode@1.5.4` — **ноль различий**
- Паритет автоверсии и автмаски на фиксированном корпусе и fuzz из 200 строк с сидом
- Сверка BCH-слов format/version для всех комбинаций
- Проверка нулевых синдромов Рида — Соломона
- **E2E-декод через OpenCV** в CI (см. `.github/workflows/ci.yml`)

---

## Миграция с других библиотек

### С `qrcode` (node-qrcode)

```typescript
// Было
import QRCode from 'qrcode';
await QRCode.toFile('qr.png', text, { errorCorrectionLevel: 'H', width: 300 });
const svg = await QRCode.toString(text, { type: 'svg' });

// Стало
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
| `width` / `margin` (пиксели) | `scale` + `margin` (модули) |
| callback / promise API | синхронные рендереры + асинхронный `qrToFile` |

**Отличия, о которых стоит знать:**
- Вывод синхронный — промисов нет, кроме `qrToFile`
- `modules` — это `boolean[][]`, а не упакованный `Uint8Array`
- Один режим на символ (выберите сами или доверьтесь автопределению лучшего единичного режима)
- Пустой вход здесь разрешён (`qrcode` бросает ошибку)
- Kanji работает сразу (`qrcode` требует `toSJISFunc`)

### С `qrcode-generator`

```typescript
// Было
import qrcode from 'qrcode-generator';
const qr = qrcode(0, 'M');
qr.addData('hello');
qr.make();
qr.createImgTag(4);

// Стало
import { generateQR, qrToSVG, qrToPNG, qrToTerminal } from '@fab-orbita/qr';
const qr = generateQR('hello', { ecLevel: 'M' });
qrToSVG(qr, { scale: 4 });
qrToPNG(qr, { scale: 4 });
qrToTerminal(qr, { small: true });
```

Полный гайд: [docs/ru/migration.md](docs/ru/migration.md).

---

## Тестирование

```bash
npm test              # запустить все тесты
npm run test:watch    # режим наблюдения
npm run test:coverage # с отчётом покрытия
```

**Набор тестов:**
- 253 теста в 28 файлах
- **Покрытие statements, branches, functions, lines — 100%**
- Побайтовый паритет с `qrcode@1.5.4` для всех 1280 комбинаций версия × EC × маска
- Property-based fuzzing (200 случайных входов с сидом)
- Тесты сквозного кодирования: `generateQR` → `qrToPNG` → декод OpenCV

---

## FAQ

<details>
<summary><b>Почему не просто <code>qrcode</code>?</b></summary>

`qrcode` — отличная библиотека, но у неё **3 прямых + ~15 транзитивных зависимостей** (`pngjs`, `yargs`, `dijkstrajs` и т.д.). Каждая — потенциальный CVE. У `@fab-orbita/qr` **ноль рантайм-зависимостей**, и всё реализовано с нуля:
- Меньший footprint установки
- Детерминированные сборки
- Нет поверхности атаки через supply chain
- Встроенный режим kanji (без инъекции `toSJISFunc`)
- Полублочный вывод в терминал

</details>

<details>
<summary><b>Работает ли в браузере?</b></summary>

**Да — официально, начиная с v1.1.0.** Пакет поставляет отдельный браузерный entry с **нулём импортов `node:*`** (проверяется в CI):

```typescript
import { generateQR, qrToSVG, qrToPNG } from '@fab-orbita/qr';
const bytes = await qrToPNG(generateQR('hello')); // асинхронно, CompressionStream
```

Работает в браузерах, Cloudflare Workers, Deno и Bun. На **Vercel Edge** `qrToPNG` бросает ошибку (там нет ни `CompressionStream`, ни `node:zlib`) — используйте `qrToSVG`. Подробности: [docs/ru/browser.md](docs/ru/browser.md).

</details>

<details>
<summary><b>Какой он по размеру в сравнении с <code>qrcode</code>?</b></summary>

- `@fab-orbita/qr`: **173.8 KB raw / 45.5 KB gzip** (ESM, включая таблицу kanji)
- `qrcode` + зависимости: обычно **~120–200 KB** в зависимости от tree-shaking

</details>

<details>
<summary><b>Поддерживает ли китайский/японский/корейский текст?</b></summary>

- **Японский (kanji)**: ✅ нативная поддержка через `mode: 'kanji'`
- **Китайский/корейский**: ⚠️ используйте `mode: 'byte'` (UTF-8) — определяется автоматически при неалфавитных символах

</details>

<details>
<summary><b>Что с уровнями коррекции ошибок?</b></summary>

- `L` — восстановление ~7%
- `M` — ~15% (по умолчанию, лучший баланс)
- `Q` — ~25%
- `H` — ~30% (лучше для печати и условий бликов)

</details>

<details>
<summary><b>Можно ли зафиксировать версию или маску?</b></summary>

Да — передайте `version` (1–40) и/или `mask` (0–7) в `generateQR`. Фиксация `mask` пропускает поиск по штрафу (быстрее, но качество символа может быть ниже).

</details>

<details>
<summary><b>Определяется ли режим kanji автоматически?</b></summary>

**Нет.** Определение Shift JIS неоднозначно для кириллицы и другого BMP-текста (например, `А` в кириллице и `ア` в катакане могут иметь перекрывающиеся байтовые диапазоны). Передавайте `mode: 'kanji'` явно.

</details>

<details>
<summary><b>Детерминирован ли вывод?</b></summary>

Да. Одинаковый вход + одинаковые опции → побайтово идентичный вывод на всех платформах и версиях Node.js. Таблица kanji зафиксирована в исходниках (не генерируется в рантайме), поэтому различий ICU нет.

</details>

---

## Документация

- 📘 [**docs/ru/api.md**](docs/ru/api.md) — полный справочник API
- 🌍 [**docs/ru/browser.md**](docs/ru/browser.md) — браузеры, edge-рантаймы, матрица поддержки
- 🍳 [**docs/ru/examples.md**](docs/ru/examples.md) — практические рецепты (URL, vCard, Wi-Fi, TOTP, платежи)
- ✅ [**docs/ru/compliance.md**](docs/ru/compliance.md) — заметки о соответствии ISO/IEC 18004 и интерпретациях
- ⚡ [**docs/ru/performance.md**](docs/ru/performance.md) — бенчмарки и размер бандла
- 🔄 [**docs/ru/migration.md**](docs/ru/migration.md) — миграция с `qrcode`, `qrcode-generator` и других
- 🔒 [**docs/ru/security.md**](docs/ru/security.md) — политика безопасности и цепочка поставок

Английские версии: [docs/](docs/).

---

## Разработка

```bash
git clone https://github.com/zammartin2/qr.git
cd qr
npm install

npm run lint          # eslint, ноль предупреждений
npm run typecheck     # tsc --noEmit
npm run test:coverage # пороги должны быть зелёными
npm run build         # rm -rf dist && tsup (3 entry)
npm run test:bundle   # esbuild-гейты + проверки exports/d.ts
npm run bench         # бенчмарк производительности
npm run docs:check    # JSDoc обязателен на каждом публичном экспорте
node scripts/analyze.mjs  # гейт размера бандла (gzip ≤ 100 КБ)
```

**Принципы:**
- Ноль рантайм-зависимостей (только встроенные модули Node)
- Спецификация прежде всего: ссылайтесь на пункты ISO/IEC 18004 в изменениях
- Требуется 100% покрытие тестами
- JSDoc на всех публичных экспортах

Полные правила: [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Безопасность

**Сообщайте об уязвимостях на [security@devorbit.ru](mailto:security@devorbit.ru)** — **не** открывайте публичный GitHub issue для сообщений о проблемах с безопасностью.

- Ноль рантайм-зависимостей → **CVE третьих сторон невозможны**
- SVG-вывод XML-эскейпит цвета (нет инъекции разметки)
- PNG-вывод использует строгий парсер `#RGB`/`#RRGGBB`
- Без `eval`, без динамических импортов пользовательских данных, без shell-out'ов

См. [SECURITY.md](SECURITY.md) и [docs/ru/security.md](docs/ru/security.md).

---

## Участие

Вклад приветствуется! Прочитайте [CONTRIBUTING.md](CONTRIBUTING.md) и [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) перед открытием PR.

Короткий чек-лист:
- [ ] Тесты проходят (`npm run test:coverage`)
- [ ] Lint чистый (`npm run lint`)
- [ ] Type-check чистый (`npm run typecheck`)
- [ ] JSDoc на публичных экспортах
- [ ] Новых рантайм-зависимостей нет

---

## Лицензия

[MIT](LICENSE) © **Фабрициус Владимир Николаевич / ООО «ДЕВОРБИТ»**

---

<div align="center">

**[⭐ Звезда на GitHub](https://github.com/zammartin2/qr) · [📦 Пакет на npm](https://www.npmjs.com/package/@fab-orbita/qr) · [🐛 Сообщить о баге](https://github.com/zammartin2/qr/issues)**
Сделано с ❤️ в Сибири
</div>
