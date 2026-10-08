import { describe, expect, it } from 'vitest';
import { generateQR } from '../../src/index';
import { qrToTerminal } from '../../src/render/terminal';
import { fixture3, fixture5 } from '../fixture';

describe('qrToTerminal (default)', () => {
  it('renders two characters per module', () => {
    expect(qrToTerminal(fixture3())).toBe('██  ██\n  ██  \n██  ██');
  });

  it('produces size lines of width 2 * size using only ██ and spaces', () => {
    const qr = generateQR('hello');
    const out = qrToTerminal(qr);
    const lines = out.split('\n');
    expect(lines).toHaveLength(qr.size);
    for (const line of lines) {
      expect(line).toHaveLength(qr.size * 2);
      expect(line).toMatch(/^(██|  )+$/);
    }
    // Spot-check pairing against the matrix.
    expect(lines[0]!.slice(0, 2)).toBe(qr.modules[0]![0] ? '██' : '  ');
    expect(lines[0]!.slice(2, 4)).toBe(qr.modules[0]![1] ? '██' : '  ');
  });

  it('is the default when options are omitted or small is false', () => {
    const qr = generateQR('hello');
    expect(qrToTerminal(qr)).toBe(qrToTerminal(qr, {}));
    expect(qrToTerminal(qr)).toBe(qrToTerminal(qr, { small: false }));
  });
});

describe('qrToTerminal({ small: true })', () => {
  it('combines two rows with half-block characters (fixture)', () => {
    // rows 0+1: 101/010 -> ▀▄▀ ; row 2 padded with light -> ▀ ▀
    expect(qrToTerminal(fixture3(), { small: true })).toBe('▀▄▀\n▀ ▀');
  });

  it('covers all four block characters', () => {
    // rows 0+1 -> both/top/bottom/light pairs
    const out = qrToTerminal(fixture5(), { small: true });
    const lines = out.split('\n');
    expect(lines).toHaveLength(3); // ceil(5 / 2)
    expect(lines[0]).toBe('▀▄▀▄▀');
    expect(lines[1]).toBe('▀▀█▄▄'); // rows 2+3: 11100/00111
    expect(lines[2]).toBe('▀▀▀▀▀'); // row 4 + padded light row
    for (const line of lines) {
      expect(line).toHaveLength(5);
      expect(line).toMatch(/^[█▀▄ ]+$/);
    }
  });

  it('pads odd heights with a light row', () => {
    const out = qrToTerminal(fixture3(), { small: true });
    expect(out.split('\n')).toHaveLength(2);
    // Last row of the fixture (101) against a light pad row -> ▀ ▀.
    expect(out.split('\n')[1]).toBe('▀ ▀');
  });
});
