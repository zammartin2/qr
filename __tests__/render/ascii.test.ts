import { describe, expect, it } from 'vitest';
import { generateQR } from '../../src/index';
import { qrToASCII } from '../../src/render/ascii';
import { fixture3, fixture5 } from '../fixture';

describe('qrToASCII', () => {
  it('renders a fixture exactly', () => {
    expect(qrToASCII(fixture3())).toBe('101\n010\n101');
    expect(qrToASCII(fixture5())).toBe(
      ['10101', '01010', '11100', '00111', '11111'].join('\n'),
    );
  });

  it('has size lines of size characters using only 0, 1 and newlines', () => {
    const qr = generateQR('hello');
    const art = qrToASCII(qr);
    expect(art.endsWith('\n')).toBe(false);
    const lines = art.split('\n');
    expect(lines).toHaveLength(qr.size);
    for (const line of lines) {
      expect(line).toHaveLength(qr.size);
      expect(line).toMatch(/^[01]+$/);
    }
    // Matches the module matrix cell by cell.
    lines.forEach((line, r) => {
      for (let c = 0; c < qr.size; c++) {
        expect(line[c] === '1').toBe(qr.modules[r]![c]);
      }
    });
  });
});
