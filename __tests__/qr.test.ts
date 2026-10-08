import { describe, expect, it } from 'vitest';
import { create as refCreate } from 'qrcode';
import { generateQR } from '../src/index';
import type { ECLevel, Mode } from '../src/core/types';

const LEVELS: ECLevel[] = ['L', 'M', 'Q', 'H'];

/** Full matrix comparison against the reference with forced single segment. */
function expectParity(
  text: string,
  mode: Mode,
  ecLevel: ECLevel,
): void {
  const ours = generateQR(text, { ecLevel });
  const ref = refCreate([{ data: text, mode }], { errorCorrectionLevel: ecLevel });

  expect(ours.version, `version for "${text.slice(0, 20)}" ${ecLevel}`).toBe(ref.version);
  expect(ours.mask, `mask for "${text.slice(0, 20)}" ${ecLevel}`).toBe(ref.maskPattern);
  expect(ours.size).toBe(ref.modules.size);

  for (let r = 0; r < ours.size; r++) {
    for (let c = 0; c < ours.size; c++) {
      if ((ours.modules[r]![c] ? 1 : 0) !== ref.modules.get(r, c)) {
        throw new Error(
          `matrix mismatch for "${text.slice(0, 20)}" ${ecLevel} at (${r},${c}) ` +
            `(v${ours.version}, mask ${ours.mask})`,
        );
      }
    }
  }
}

describe('generateQR — basics', () => {
  it('generates a v1-M byte QR for "hello"', () => {
    const qr = generateQR('hello');
    expect(qr.version).toBe(1);
    expect(qr.size).toBe(21);
    expect(qr.ecLevel).toBe('M');
    expect(qr.mode).toBe('byte');
    expect(qr.mask).toBeGreaterThanOrEqual(0);
    expect(qr.mask).toBeLessThanOrEqual(7);
    expect(qr.modules).toHaveLength(21);
    // Finder pattern present.
    expect(qr.modules[0]![0]).toBe(true);
    expect(qr.modules[0]![10]).toBe(true);
  });

  it('auto-detects modes', () => {
    expect(generateQR('12345').mode).toBe('numeric');
    expect(generateQR('HELLO WORLD').mode).toBe('alphanumeric');
    expect(generateQR('hello').mode).toBe('byte');
    expect(generateQR('Фабрициус').mode).toBe('byte');
    expect(generateQR('').mode).toBe('byte');
  });

  it('honours ecLevel / version / mask options', () => {
    expect(generateQR('hello', { ecLevel: 'H' }).ecLevel).toBe('H');
    expect(generateQR('hello', { version: 5 }).version).toBe(5);
    const masked = generateQR('hello', { mask: 3 });
    expect(masked.mask).toBe(3);
    expect(masked.size).toBe(21);
    expect(generateQR('hello', { version: 10, mask: 7 }).size).toBe(57);
  });

  it('honours forced mode', () => {
    const numeric = generateQR('12345', { mode: 'numeric' });
    expect(numeric.mode).toBe('numeric');
    // Forced byte mode for the same digits uses more space.
    const byte = generateQR('12345', { mode: 'byte' });
    expect(byte.mode).toBe('byte');
    expect(byte.version).toBeGreaterThanOrEqual(numeric.version);
  });

  it('encodes kanji mode when requested explicitly', () => {
    const qr = generateQR('テスト', { mode: 'kanji', ecLevel: 'M' });
    expect(qr.mode).toBe('kanji');
    expect(qr.size).toBe(4 * qr.version + 17);
    expect(qr.version).toBeGreaterThanOrEqual(1);
    // Kanji packs 13 bits per char — the same text in byte mode needs
    // 4 bytes per char and must land on a version at least as large.
    const asByte = generateQR('テスト', { mode: 'byte' });
    expect(qr.version).toBeLessThanOrEqual(asByte.version);
  });

  it('respects minVersion / maxVersion', () => {
    expect(generateQR('hi', { minVersion: 7 }).version).toBe(7);
    expect(generateQR('hi', { minVersion: 1, maxVersion: 3 }).version).toBe(1);
    expect(() => generateQR('hi', { minVersion: 1, maxVersion: 2, version: 9 })).not.toThrow();
    // Forced version ignores the range (explicit wins).
    expect(generateQR('hi', { version: 9, minVersion: 1, maxVersion: 3 }).version).toBe(9);
  });

  it('handles empty text', () => {
    const qr = generateQR('');
    expect(qr.version).toBe(1);
    expect(qr.mode).toBe('byte');
    expect(qr.size).toBe(21);
  });
});

describe('generateQR — validation errors', () => {
  it('rejects non-string text', () => {
    expect(() => generateQR(123 as unknown as string)).toThrow(TypeError);
    expect(() => generateQR(null as unknown as string)).toThrow(TypeError);
    expect(() => generateQR(undefined as unknown as string)).toThrow(TypeError);
  });

  it('rejects invalid options', () => {
    expect(() => generateQR('x', { ecLevel: 'Z' as ECLevel })).toThrow(RangeError);
    expect(() => generateQR('x', { version: 0 })).toThrow(RangeError);
    expect(() => generateQR('x', { version: 41 })).toThrow(RangeError);
    expect(() => generateQR('x', { version: 2.5 })).toThrow(RangeError);
    expect(() => generateQR('x', { mask: -1 })).toThrow(RangeError);
    expect(() => generateQR('x', { mask: 8 })).toThrow(RangeError);
    expect(() => generateQR('x', { mask: 1.5 })).toThrow(RangeError);
    expect(() => generateQR('x', { mode: 'wat' as Mode })).toThrow(RangeError);
    expect(() => generateQR('x', { minVersion: 0 })).toThrow(RangeError);
    expect(() => generateQR('x', { maxVersion: 41 })).toThrow(RangeError);
    expect(() => generateQR('x', { minVersion: 5, maxVersion: 4 })).toThrow(RangeError);
  });

  it('rejects data too long for the allowed range', () => {
    expect(() => generateQR('A'.repeat(500), { ecLevel: 'H', maxVersion: 3 })).toThrow(
      /data too long/,
    );
  });

  it('rejects payloads invalid for a forced mode', () => {
    expect(() => generateQR('ABC', { mode: 'numeric' })).toThrow(RangeError);
    expect(() => generateQR('abc', { mode: 'alphanumeric' })).toThrow(RangeError);
    expect(() => generateQR('hello 🙂', { mode: 'kanji' })).toThrow(/Kanji mode/);
  });

  it('rejects text that does not fit a forced version', () => {
    expect(() => generateQR('A'.repeat(30), { version: 1, ecLevel: 'H' })).toThrow(
      /data too long/,
    );
  });
});

describe('generateQR — parity with qrcode (auto version + auto mask)', () => {
  it('fixed corpus across modes and EC levels', () => {
    const corpus: [string, Mode][] = [
      ['0', 'numeric'],
      ['01234567', 'numeric'],
      ['1234567890123456789012345678901234567890', 'numeric'],
      ['A', 'alphanumeric'],
      ['HELLO WORLD', 'alphanumeric'],
      ['THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG 0123456789', 'alphanumeric'],
      ['a', 'byte'],
      ['hello world', 'byte'],
      ['Фабрициус Владимир Николаевич', 'byte'],
      ['https://example.com/тест?x=1&y=2', 'byte'],
      ['emoji 🙂 mixed 日本語 text', 'byte'],
      ['x'.repeat(300), 'byte'],
      ['9'.repeat(1000), 'numeric'],
      ['Z'.repeat(700), 'alphanumeric'],
    ];
    for (const [text, mode] of corpus) {
      for (const ecLevel of LEVELS) {
        expectParity(text, mode, ecLevel);
      }
    }
  }, 60_000);

  it('seeded fuzz: random strings, EC levels, versions and masks', () => {
    let seed = 0xc0ffee;
    const next = (bound: number): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % bound;
    };

    const pools: [string, Mode][] = [
      ['0123456789', 'numeric'],
      ['0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:', 'alphanumeric'],
      ['abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?.,-_@', 'byte'],
      ['Фабрициус Владимир — тесты ✓ 🙂 日本語 кириллица', 'byte'],
    ];

    let checked = 0;
    for (let i = 0; i < 200; i++) {
      const [pool, mode] = pools[next(pools.length)]!;
      const length = next(160);
      let text = '';
      for (let j = 0; j < length; j++) text += pool[next(pool.length)];
      if (text.length === 0) continue;
      const ecLevel = LEVELS[next(LEVELS.length)]!;
      expectParity(text, mode, ecLevel);
      checked++;
    }
    expect(checked).toBeGreaterThan(150);
  }, 120_000);

  it('randomized options produce valid symbols', () => {
    let seed = 42;
    const next = (bound: number): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % bound;
    };
    for (let i = 0; i < 100; i++) {
      const text = `payload-${next(10_000_000)}-${'x'.repeat(next(50))}`;
      const qr = generateQR(text, {
        ecLevel: LEVELS[next(4)]!,
        minVersion: 1 + next(5),
      });
      expect(qr.size).toBe(4 * qr.version + 17);
      expect(qr.version).toBeGreaterThanOrEqual(1);
      expect(qr.version).toBeLessThanOrEqual(40);
      expect(qr.mask).toBeGreaterThanOrEqual(0);
      expect(qr.mask).toBeLessThanOrEqual(7);
      expect(qr.modules).toHaveLength(qr.size);
      // Finder corners are always dark.
      expect(qr.modules[0]![0]).toBe(true);
      expect(qr.modules[0]![qr.size - 1]).toBe(true);
      expect(qr.modules[qr.size - 1]![0]).toBe(true);
    }
  }, 30_000);
});
