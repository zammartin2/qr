import { describe, expect, it } from 'vitest';
import { charCountBits, chooseMode } from '../../src/core/encode/mode';
import type { Mode } from '../../src/core/types';

describe('chooseMode', () => {
  it('detects numeric', () => {
    expect(chooseMode('01234567')).toBe('numeric');
    expect(chooseMode('0')).toBe('numeric');
    expect(chooseMode('000')).toBe('numeric');
  });

  it('detects alphanumeric', () => {
    expect(chooseMode('HELLO WORLD')).toBe('alphanumeric');
    expect(chooseMode('A')).toBe('alphanumeric');
    expect(chooseMode('0123456789ABCXYZ $%*+-./:')).toBe('alphanumeric');
    expect(chooseMode('THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG 0123456789')).toBe(
      'alphanumeric',
    );
  });

  it('falls back to byte', () => {
    expect(chooseMode('Hello')).toBe('byte'); // lowercase
    expect(chooseMode('hello world')).toBe('byte');
    expect(chooseMode('Фабрициус')).toBe('byte'); // Cyrillic
    expect(chooseMode('a1')).toBe('byte');
    expect(chooseMode('!')).toBe('byte'); // not in the 45-char set
    expect(chooseMode('emoji 🙂')).toBe('byte');
  });

  it('returns byte for empty text', () => {
    expect(chooseMode('')).toBe('byte');
  });

  it('never returns kanji', () => {
    expect(chooseMode('あいう')).not.toBe('kanji');
    expect(chooseMode('漢字')).toBe('byte');
  });

  it('rejects non-string input', () => {
    expect(() => chooseMode(123 as unknown as string)).toThrow(RangeError);
  });
});

describe('charCountBits', () => {
  it('numeric: 10 / 12 / 14 by version group', () => {
    expect(charCountBits('numeric', 1)).toBe(10);
    expect(charCountBits('numeric', 9)).toBe(10);
    expect(charCountBits('numeric', 10)).toBe(12);
    expect(charCountBits('numeric', 26)).toBe(12);
    expect(charCountBits('numeric', 27)).toBe(14);
    expect(charCountBits('numeric', 40)).toBe(14);
  });

  it('alphanumeric: 9 / 11 / 13', () => {
    expect(charCountBits('alphanumeric', 1)).toBe(9);
    expect(charCountBits('alphanumeric', 9)).toBe(9);
    expect(charCountBits('alphanumeric', 10)).toBe(11);
    expect(charCountBits('alphanumeric', 26)).toBe(11);
    expect(charCountBits('alphanumeric', 27)).toBe(13);
    expect(charCountBits('alphanumeric', 40)).toBe(13);
  });

  it('byte: 8 / 16 / 16', () => {
    expect(charCountBits('byte', 1)).toBe(8);
    expect(charCountBits('byte', 9)).toBe(8);
    expect(charCountBits('byte', 10)).toBe(16);
    expect(charCountBits('byte', 27)).toBe(16);
    expect(charCountBits('byte', 40)).toBe(16);
  });

  it('kanji: 8 / 10 / 12', () => {
    expect(charCountBits('kanji', 1)).toBe(8);
    expect(charCountBits('kanji', 9)).toBe(8);
    expect(charCountBits('kanji', 10)).toBe(10);
    expect(charCountBits('kanji', 26)).toBe(10);
    expect(charCountBits('kanji', 27)).toBe(12);
    expect(charCountBits('kanji', 40)).toBe(12);
  });

  it('rejects invalid mode or version', () => {
    expect(() => charCountBits('emoji' as Mode, 1)).toThrow(RangeError);
    expect(() => charCountBits('numeric', 0)).toThrow(RangeError);
    expect(() => charCountBits('numeric', 41)).toThrow(RangeError);
    expect(() => charCountBits('numeric', 1.5)).toThrow(RangeError);
  });
});
