# Examples

**Русская версия:** [ru/examples.md](ru/examples.md)

Practical recipes for `@fab-orbita/qr`. All examples assume:

```typescript
import {
  generateQR, qrToFile, qrToTerminal, qrToSVG, qrToPNG, qrToASCII,
} from '@fab-orbita/qr';
```

`qrToFile` is Node.js only. In browsers and edge runtimes, use `qrToSVG` (sync) or `qrToPNG` (async) and feed the result to a Blob or data URL. See [browser.md](browser.md) for the environment matrix.

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

const qr = generateQR(vcard, { ecLevel: 'Q' }); // Q protects contact data
await qrToFile(qr, 'vcard.png', { scale: 8 });
```

## Wi-Fi

```typescript
function wifiQr(
  ssid: string,
  password: string,
  security: 'WPA' | 'WPA3' | 'WEP' | 'nopass' = 'WPA',
) {
  // Per the Wi-Fi QR spec, these five characters are special in SSID and
  // password fields and must be backslash-escaped.
  const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');
  const body =
    security === 'nopass'
      ? `WIFI:T:nopass;S:${esc(ssid)};;`
      : `WIFI:T:${security};S:${esc(ssid)};P:${esc(password)};;`;
  return generateQR(body, { ecLevel: 'H' }); // H: survives prints & glare
}

await qrToFile(wifiQr('Orbita-5G', 's3cret!pass'), 'wifi.svg', { scale: 10 });
```

`'WEP'` is kept for legacy devices. Prefer `'WPA'` or `'WPA3'` for new deployments.

## 2FA / TOTP (otpauth URI)

```typescript
const otpauth =
  'otpauth://totp/Example:admin@example.com' +
  '?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA1&digits=6&period=30';

const qr = generateQR(otpauth, { ecLevel: 'M' });
console.log(qrToTerminal(qr, { small: true })); // paste straight into a CLI
```

otpauth URIs are short and mostly alphanumeric — auto-detection typically picks alphanumeric mode. If the issuer or label contains non-ASCII characters, byte mode is used automatically.

## Payments

```typescript
// Bitcoin BIP-21 (replace with a real address)
const btc = 'bitcoin:bc1qexampleaddress?amount=0.01&label=Orbita';

// Any crypto / IBAN-style payment link (replace with a real address)
const usdt = 'ton://transfer/EQC123...?amount=25.5';

await qrToFile(generateQR(btc, { ecLevel: 'H' }), 'btc.png', { scale: 10 });
await qrToFile(generateQR(usdt, { ecLevel: 'H' }), 'usdt.svg', { scale: 12 });
```

`margin` defaults to 4 modules in both renderers — pass it explicitly only if you need a different quiet zone.

## Kanji mode

```typescript
// Explicit only — kanji is never auto-detected.
const qr = generateQR('東京タワー', { mode: 'kanji', ecLevel: 'M' });
console.log(qr.mode);    // 'kanji'
console.log(qr.version); // 1 (kanji is very compact)

// Characters outside Shift JIS (emoji, for example) throw a descriptive error:
// generateQR('東京🙂', { mode: 'kanji' });
// RangeError: character U+1F642 "🙂" cannot be encoded in Kanji mode (not in Shift JIS)
```

## Terminal art in CI logs

```typescript
const qr = generateQR('https://ci.example.com/build/42');
process.stdout.write(qrToTerminal(qr, { small: true }) + '\n');
```

No ANSI escape codes are emitted — safe to embed in CI logs, README files, or plain-text emails.

## ASCII art

```typescript
const qr = generateQR('hello');
console.log(qrToASCII(qr));
// 111111100011101111111
// 100000100001001000001
// 101110101010101011101
// ...
```

No quiet zone is added — the output is exactly `size × size` characters.

## Custom styling

```typescript
const dark = '#101820';
const light = '#FFFBF0';

const qr = generateQR('hello', { ecLevel: 'Q' });

// SVG accepts any CSS colour string (XML-escaped).
const svg = qrToSVG(qr, { scale: 16, margin: 4, dark, light });

// PNG accepts #RGB or #RRGGBB only.
const png = qrToPNG(qr, { scale: 8, margin: 4, dark, light }); // Node: Buffer
```

Keep high contrast between dark and light — QR readers expect dark modules to be significantly darker than light ones. Inverted or low-contrast symbols may not scan.

In the browser, `qrToPNG` is async:

```typescript
const bytes = await qrToPNG(qr, { scale: 8, dark, light });
const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
```

## Bounded versions

```typescript
// At least version 7 (e.g. to guarantee version info blocks for testing)
generateQR('hi', { minVersion: 7 });

// Never exceed version 5 — throws if the data does not fit
generateQR('hi', { maxVersion: 5, ecLevel: 'H' });           // fits, version 1
generateQR('a'.repeat(200), { maxVersion: 5, ecLevel: 'H' }); // RangeError
```

## Data URL

```typescript
// Node
import { Buffer } from 'node:buffer';
const png = qrToPNG(generateQR('hello'));
const dataUrl = 'data:image/png;base64,' + png.toString('base64');

// Browser
const bytes = await qrToPNG(generateQR('hello'));
const dataUrl = await new Promise<string>((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.readAsDataURL(new Blob([bytes], { type: 'image/png' }));
});
```

## Batch generation

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

## HTTP server (Node.js)

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

## React component

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

## Error handling

```typescript
import { generateQR } from '@fab-orbita/qr';

try {
  const qr = generateQR(userInput, { ecLevel: 'H', maxVersion: 10 });
  console.log(qr.version, qr.mask, qr.mode);
} catch (err) {
  if (err instanceof RangeError) {
    // data too long, invalid option, or mode cannot encode the input
    console.error('QR generation failed:', err.message);
  } else {
    throw err;
  }
}
```

## Inspecting the result

```typescript
const qr = generateQR('hello');
console.log(qr.version);  // 1
console.log(qr.size);     // 21
console.log(qr.mode);     // 'byte'
console.log(qr.ecLevel);  // 'M'
console.log(qr.mask);     // 0-7 (auto-selected)
console.log(qr.modules);  // boolean[21][21], true = dark
```

For the full option reference, see [api.md](api.md).

Applies to v1.1.0. See [CHANGELOG.md](../CHANGELOG.md) for history.
