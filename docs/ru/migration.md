# Гайд по миграции

**English:** [../migration.md](../migration.md)

Этот гайд покрывает миграцию с `qrcode` (node-qrcode), `qrcode-generator` и подобных библиотек. Полный справочник опций — [api.md](../ru/api.md); рецепты — [examples.md](../ru/examples.md).

## С `qrcode` (node-qrcode)

> `qrcode` также публикуется как `node-qrcode` — это один и тот же пакет.

```typescript
// Было
import QRCode from 'qrcode';
await QRCode.toFile('qr.png', text, { errorCorrectionLevel: 'H', width: 300 });
const svg = await QRCode.toString(text, { type: 'svg' });

// Стало
import { generateQR, qrToFile, qrToSVG } from '@fab-orbita/qr';
const qr = generateQR(text, { ecLevel: 'H' });
// width 300 px ≈ scale * (qr.size + 2 * margin) → scale ≈ 300 / (qr.size + 8)
await qrToFile(qr, 'qr.png', { scale: Math.round(300 / (qr.size + 8)) });
const svg = qrToSVG(qr, { scale: 8 });
```

| `qrcode` | `@fab-orbita/qr` |
|---|---|
| `errorCorrectionLevel: 'M'` | `ecLevel: 'M'` (те же значения `'L' \| 'M' \| 'Q' \| 'H'`) |
| `version: 5` | `version: 5` |
| `maskPattern: 3` | `mask: 3` |
| `QRCode.toBuffer(text, opts)` | `qrToPNG(qr, opts)` — синхронный `Buffer` (Node) |
| `QRCode.toDataURL(text, opts)` | Прямого аналога нет — `qrToPNG` + собёрите base64 сами |
| `QRCode.toString(text, { type: 'svg' })` | `qrToSVG(qr, opts)` — синхронная строка |
| `QRCode.toString(text, { type: 'terminal' })` | `qrToTerminal(qr, { small: true })` |
| `QRCode.create(text)` → `{ modules: { data, size } }` | `generateQR(text)` → `{ modules: boolean[][], size }` |
| `modules.data[row * size + col]` (упаковано) | `qr.modules[row][col]` (boolean) |
| `width` (px, итоговый) | `scale` (px на модуль): `scale = width / (qr.size + 2 * margin)` |
| `margin` (модули, по умолчанию 4) | `margin` (модули, по умолчанию 4) |
| Callback / promise API | Синхронные рендереры + `qrToFile` (асинхронная запись файла) |

### Отличия, о которых стоит знать

- **Вывод в Node синхронный** — промисов нет, кроме `qrToFile`. В браузерах и edge-рантаймах `qrToPNG` асинхронный (`Promise<Uint8Array>`); тот же импортный спецификатор резолвится в браузерный entry. См. [browser.md](../ru/browser.md).
- **`modules` — это `boolean[][]`**, а не упакованный `Uint8Array`. Итерируйте `qr.modules[row][col]`; индекс `row * size + col` больше не применим.
- **Один режим на символ.** `qrcode` автоматически разбивает строки на несколько режимов (мешая numeric + alphanumeric + byte). Эта библиотека кодирует один режим на символ — передайте `mode` или доверьтесь автопределению лучшего единичного режима. Для большинства входов (URL, цифры, текст в верхнем регистре) результат совпадает; для смешанного регистра с цифрами `qrcode` может выбрать меньшую версию.
- **Byte-режим считает байты UTF-8**, а не кодовые единицы JS — как стандарт и `qrcode`.
- **Значение `width` по умолчанию отличается.** `qrcode` вычисляет ширину автоматически из числа модулей; `@fab-orbita/qr` использует фиксированные значения `scale` (PNG 4, SVG 1). Задавайте `scale` явно для конкретного размера в пикселях.
- **Фиксация маски пропускает поиск по штрафу.** Как и в `qrcode` — символ остаётся валидным, но штрафный балл может оказаться выше, чем дал бы автовыбор.
- **Пустой вход здесь разрешён** (`qrcode` бросает ошибку).
- **Режим kanji работает из коробки**; `qrcode` требует инъекции `toSJISFunc`.
- **Типы в комплекте** — пакета `@types/...` не нужно. После миграции уберите `@types/qrcode` из `devDependencies`.
- **Двойной ESM + CJS** — импорт работает нативно в ESM-проектах, interop-обёртки не нужны. `qrcode` — только CJS.
- **Ноль рантайм-зависимостей** — `qrcode` тянет `dijkstrajs`, `pngjs`, `yargs` и их транзитивное дерево.

## С `qrcode-generator`

```typescript
// Было
import qrcode from 'qrcode-generator';
const qr = qrcode(0, 'M');
qr.addData('hello');
qr.make();
qr.createImgTag(4);       // или createSvgTag / createDataURL / createASCII

// Стало
import { generateQR, qrToSVG, qrToPNG, qrToTerminal, qrToASCII } from '@fab-orbita/qr';
const qr = generateQR('hello', { ecLevel: 'M' });
qrToSVG(qr, { scale: 4 });
qrToPNG(qr, { scale: 4 });
qrToTerminal(qr, { small: true });
qrToASCII(qr);
```

| `qrcode-generator` | `@fab-orbita/qr` |
|---|---|
| `qrcode(typeNumber, errorCorrectionLevel)` — `0` = авто | Опустите `version` (авто) или задайте `version: 1..40` |
| `addData(data, mode)` (можно вызывать повторно) | `generateQR(text, { mode })` — один режим на символ |
| `createImgTag(cellSize)` | `qrToPNG` / `qrToSVG` + собственный `<img>` или Blob-обёртка |
| `createSvgTag(cellSize)` | `qrToSVG(qr, { scale: cellSize })` |
| `createDataURL(cellSize)` | `qrToPNG` + base64-обёртка |
| `createASCII(cellSize)` | `qrToASCII(qr)` — без cell size, 1 символ на модуль |
| Только CJS, без типов | ESM + CJS, встроенные `.d.ts` |
| Маска выбирается внутри, без контроля штрафа | 8 масок + опция `mask` |

**Мультисегмент не поддерживается.** `qrcode-generator` допускает повторные вызовы `addData` (смешение режимов в одном символе); `@fab-orbita/qr` кодирует один режим на символ. Выберите режим, подходящий для всего полезной нагрузки.

## С `qrcode-terminal`

```typescript
// Было
import qrcode from 'qrcode-terminal';
qrcode.generate('hello', { small: true });

// Стало
import { generateQR, qrToTerminal } from '@fab-orbita/qr';
console.log(qrToTerminal(generateQR('hello'), { small: true }));
```

## С `qr-image`

```typescript
// Было
import qr from 'qr-image';
import { writeFileSync } from 'node:fs';
writeFileSync('qr.png', qr.imageSync('hello', { type: 'png', size: 8 }));

// Стало
import { generateQR, qrToPNG } from '@fab-orbita/qr';
import { writeFileSync } from 'node:fs';
writeFileSync('qr.png', qrToPNG(generateQR('hello'), { scale: 8 }));
```

## С другими библиотеками

Общее соответствие:

- Замените promise/callback-рендереры синхронными `qrToSVG` / `qrToPNG` / `qrToTerminal` / `qrToASCII`. Асинхронен только `qrToFile` (и только для Node).
- Сопоставьте названия уровней коррекции — большинство библиотек используют те же L/M/Q/H.
- Если полагались на multi-segment-оптимизацию (смешение numeric + byte в одном символе), выберите лучший единичный режим вручную через `mode` — различия в ёмкости для типичных нагрузок малы.
- Пиксельные опции (`width`, `scale` в px) становятся `scale` в модулях — умножьте на число модулей для точного размера: `width ≈ scale * (qr.size + 2 * margin)`.

---

Применяется к v1.1.0. История изменений: [CHANGELOG.md](../../CHANGELOG.md).
