# Примеры

**English:** [../examples.md](../examples.md)

Практические рецепты для `@fab-orbita/qr`. Во всех примерах предполагается:

```typescript
import {
  generateQR, qrToFile, qrToTerminal, qrToSVG, qrToPNG, qrToASCII,
} from '@fab-orbita/qr';
```

`qrToFile` — только для Node.js. В браузерах и edge-рантаймах используйте `qrToSVG` (синхронно) или `qrToPNG` (асинхронно) и передавайте результат в Blob или data URL. Матрица окружений — [browser.md](../ru/browser.md).

## URL

```typescript
const qr = generateQR('https://example.com/promo?src=qr', { ecLevel: 'M' });
await qrToFile(qr, 'promo.svg', { scale: 12 });
```

## vCard

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

const qr = generateQR(vcard, { ecLevel: 'Q' }); // Q защищает контактные данные
await qrToFile(qr, 'vcard.png', { scale: 8 });
```

## Wi-Fi

```typescript
function wifiQr(
  ssid: string,
  password: string,
  security: 'WPA' | 'WPA3' | 'WEP' | 'nopass' = 'WPA',
) {
  // По спецификации Wi-Fi QR эти пять символов особы в полях SSID и
  // пароля — их нужно экранировать обратным слэшем.
  const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');
  const body =
    security === 'nopass'
      ? `WIFI:T:nopass;S:${esc(ssid)};;`
      : `WIFI:T:${security};S:${esc(ssid)};P:${esc(password)};;`;
  return generateQR(body, { ecLevel: 'H' }); // H: переживает печать и блики
}

await qrToFile(wifiQr('Orbita-5G', 's3cret!pass'), 'wifi.svg', { scale: 10 });
```

`'WEP'` оставлен для старых устройств. Для новых развёртываний используйте `'WPA'` или `'WPA3'`.

## 2FA / TOTP (otpauth URI)

```typescript
const otpauth =
  'otpauth://totp/Example:admin@example.com' +
  '?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA1&digits=6&period=30';

const qr = generateQR(otpauth, { ecLevel: 'M' });
console.log(qrToTerminal(qr, { small: true })); // сразу в CLI
```

otpauth URI короткие и в основном alphanumeric — автопределение обычно выбирает alphanumeric-режим. Если issuer или label содержит не-ASCII символы, автоматически используется byte-режим.

## Платежи

```typescript
// Bitcoin BIP-21 (замените на реальный адрес)
const btc = 'bitcoin:bc1qexampleaddress?amount=0.01&label=Orbita';

// Любая крипто-/IBAN-платёжная ссылка (замените на реальный адрес)
const usdt = 'ton://transfer/EQC123...?amount=25.5';

await qrToFile(generateQR(btc, { ecLevel: 'H' }), 'btc.png', { scale: 10 });
await qrToFile(generateQR(usdt, { ecLevel: 'H' }), 'usdt.svg', { scale: 12 });
```

`margin` по умолчанию равен 4 модулям в обоих рендерерах — передавайте явно, только если нужна другая тихая зона.

## Режим kanji

```typescript
// Только явно — kanji никогда не определяется автоматически.
const qr = generateQR('東京タワー', { mode: 'kanji', ecLevel: 'M' });
console.log(qr.mode);    // 'kanji'
console.log(qr.version); // 1 (kanji очень компактен)

// Символы вне Shift JIS (например, эмодзи) бросают понятную ошибку:
// generateQR('東京🙂', { mode: 'kanji' });
// RangeError: character U+1F642 "🙂" cannot be encoded in Kanji mode (not in Shift JIS)
```

## Терминальный арт в логах CI

```typescript
const qr = generateQR('https://ci.example.com/build/42');
process.stdout.write(qrToTerminal(qr, { small: true }) + '\n');
```

ANSI-escape-коды не выводятся — безопасно встраивать в логи CI, README или текстовые письма.

## ASCII-арт

```typescript
const qr = generateQR('hello');
console.log(qrToASCII(qr));
// 111111100011101111111
// 100000100001001000001
// 101110101010101011101
// ...
```

Тихая зона не добавляется — вывод ровно `size × size` символов.

## Кастомные стили

```typescript
const dark = '#101820';
const light = '#FFFBF0';

const qr = generateQR('hello', { ecLevel: 'Q' });

// SVG принимает любую CSS-строку цвета (XML-эскейпится).
const svg = qrToSVG(qr, { scale: 16, margin: 4, dark, light });

// PNG принимает только #RGB или #RRGGBB.
const png = qrToPNG(qr, { scale: 8, margin: 4, dark, light }); // Node: Buffer
```

Сохраняйте высокий контраст между тёмным и светлым — считыватели QR ожидают, что тёмные модули будут заметно темнее светлых. Инвертированные или низкоконтрастные символы могут не сканироваться.

В браузере `qrToPNG` асинхронный:

```typescript
const bytes = await qrToPNG(qr, { scale: 8, dark, light });
const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
```

## Ограниченные версии

```typescript
// Как минимум версия 7 (например, чтобы гарантировать блоки version info в тестах)
generateQR('hi', { minVersion: 7 });

// Никогда не выше версии 5 — ошибка, если данные не влезают
generateQR('hi', { maxVersion: 5, ecLevel: 'H' });           // влезает, версия 1
generateQR('a'.repeat(200), { maxVersion: 5, ecLevel: 'H' }); // RangeError
```

## Data URL

```typescript
// Node
import { Buffer } from 'node:buffer';
const png = qrToPNG(generateQR('hello'));
const dataUrl = 'data:image/png;base64,' + png.toString('base64');

// Браузер
const bytes = await qrToPNG(generateQR('hello'));
const dataUrl = await new Promise<string>((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.readAsDataURL(new Blob([bytes], { type: 'image/png' }));
});
```

## Пакетная генерация

```typescript
const urls = [
  'https://example.com/a',
  'https://example.com/b',
  'https://example.com/c',
];

for (const [i, url] of urls.entries()) {
  await qrToFile(generateQR(url, { ecLevel: 'M' }), `qr-${i}.png`, { scale: 8 });
}
```

## HTTP-сервер (Node.js)

```typescript
import { createServer } from 'node:http';
import { generateQR, qrToPNG } from '@fab-orbita/qr';

createServer((req, res) => {
  const text = new URL(req.url!, 'http://localhost').searchParams.get('text') ?? 'hello';
  const png = qrToPNG(generateQR(text, { ecLevel: 'M' }), { scale: 6 });
  res.writeHead(200, { 'Content-Type': 'image/png' });
  res.end(png);
}).listen(3000);
```

## React-компонент

```tsx
import { useMemo } from 'react';
import { generateQR, qrToSVG } from '@fab-orbita/qr';

export function QrCode({ text, size = 256 }: { text: string; size?: number }) {
  const svg = useMemo(() => {
    const qr = generateQR(text, { ecLevel: 'M' });
    return qrToSVG(qr, { scale: size / (qr.size + 8) });
  }, [text, size]);

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
```

## Обработка ошибок

```typescript
import { generateQR } from '@fab-orbita/qr';

try {
  const qr = generateQR(userInput, { ecLevel: 'H', maxVersion: 10 });
  console.log(qr.version, qr.mask, qr.mode);
} catch (err) {
  if (err instanceof RangeError) {
    // данные слишком длинны, неверная опция или режим не может закодировать вход
    console.error('QR generation failed:', err.message);
  } else {
    throw err;
  }
}
```

## Инспекция результата

```typescript
const qr = generateQR('hello');
console.log(qr.version);  // 1
console.log(qr.size);     // 21
console.log(qr.mode);     // 'byte'
console.log(qr.ecLevel);  // 'M'
console.log(qr.mask);     // 0-7 (автовыбор)
console.log(qr.modules);  // boolean[21][21], true = тёмный
```

Полный справочник опций: [api.md](../ru/api.md).

Применяется к v1.1.0. История: [CHANGELOG.md](../../CHANGELOG.md).
