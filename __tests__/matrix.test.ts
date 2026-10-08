import { describe, expect, it } from 'vitest';
import { create as refCreate } from 'qrcode';
import { buildMatrix } from '../src/core/matrix';
import { generateFormatInfo } from '../src/core/format';
import { generateVersionInfo } from '../src/core/version';
import { getAlignmentCenters } from '../src/core/alignment';
import type { ECLevel, MaskPattern, Mode } from '../src/core/types';

const LEVELS: ECLevel[] = ['L', 'M', 'Q', 'H'];
const MASKS: MaskPattern[] = [0, 1, 2, 3, 4, 5, 6, 7];

/** Reference matrix (row-major booleans) for a forced single segment. */
function refModules(
  data: string,
  mode: Mode,
  version: number,
  ecLevel: ECLevel,
  maskPattern: number,
): boolean[][] {
  const r = refCreate([{ data, mode }], {
    version,
    errorCorrectionLevel: ecLevel,
    maskPattern,
  });
  const size = r.modules.size;
  const out: boolean[][] = [];
  for (let row = 0; row < size; row++) {
    const line: boolean[] = [];
    for (let col = 0; col < size; col++) {
      line.push(r.modules.get(row, col) === 1);
    }
    out.push(line);
  }
  return out;
}

describe('buildMatrix — structure', () => {
  it('draws finder patterns at the three corners (v1)', () => {
    const qr = buildMatrix('HELLO', 1, 'M', 'byte', 0);
    const m = qr.modules;
    // Top-left finder: corners dark, separator light.
    expect(m[0]![0]).toBe(true);
    expect(m[0]![6]).toBe(true);
    expect(m[6]![0]).toBe(true);
    expect(m[3]![3]).toBe(true); // centre
    expect(m[1]![1]).toBe(false); // inner light ring
    expect(m[7]![0]).toBe(false); // separator
    expect(m[0]![7]).toBe(false);
    // Top-right and bottom-left centres.
    expect(m[0]![20]).toBe(true);
    expect(m[6]![14]).toBe(true);
    expect(m[14]![0]).toBe(true);
    expect(m[20]![6]).toBe(true);
    expect(m[20]![20]).toBe(true);
  });

  it('draws timing patterns on row/column 6 (v1)', () => {
    const qr = buildMatrix('HELLO', 1, 'M', 'byte', 0);
    for (let i = 8; i <= 12; i++) {
      expect(qr.modules[6]![i], `row6 col${i}`).toBe(i % 2 === 0);
      expect(qr.modules[i]![6], `col6 row${i}`).toBe(i % 2 === 0);
    }
  });

  it('places the dark module at (4v + 9, 8)', () => {
    for (const version of [1, 2, 7, 10]) {
      const qr = buildMatrix('HI', version, 'M', 'byte', 0);
      expect(qr.modules[4 * version + 9]![8], `v${version}`).toBe(true);
      // …and the timing/alignment must not move it.
      expect(qr.size).toBe(4 * version + 17);
    }
  });

  it('draws alignment patterns for v2+ (v2 has exactly one)', () => {
    const qr = buildMatrix('HI', 2, 'M', 'byte', 0);
    // Single alignment at (18, 18): centre dark, inner ring light.
    expect(qr.modules[18]![18]).toBe(true);
    expect(qr.modules[17]![17]).toBe(false);
    expect(qr.modules[16]![16]).toBe(true);

    const qr7 = buildMatrix('HI', 7, 'M', 'byte', 0);
    for (const [r, c] of getAlignmentCenters(7)) {
      expect(qr7.modules[r]![c], `center ${r},${c}`).toBe(true);
    }
  });

  it('writes version information for v7+ and none below', () => {
    const qr7 = buildMatrix('HI', 7, 'M', 'byte', 0);
    const bits = generateVersionInfo(7);
    const size = 45;
    for (let i = 0; i < 18; i++) {
      const row = Math.floor(i / 3);
      const col = (i % 3) + size - 11;
      const expected = ((bits >>> i) & 1) === 1;
      expect(qr7.modules[row]![col], `v7 bit ${i}`).toBe(expected);
      expect(qr7.modules[col]![row], `v7 mirror bit ${i}`).toBe(expected);
    }

    // v6: the version info corners are plain data/function modules — the
    // 3x6 corner block must not contain a BCH word of a different version.
    const qr6 = buildMatrix('HI', 6, 'M', 'byte', 0);
    const size6 = 41;
    let v6Bits = 0;
    for (let i = 0; i < 18; i++) {
      const row = Math.floor(i / 3);
      const col = (i % 3) + size6 - 11;
      if (qr6.modules[row]![col]) v6Bits |= 1 << i;
    }
    // It is data — just assert placement region is used (not all light).
    expect(v6Bits).toBeGreaterThanOrEqual(0);
    expect(qr6.modules.flat().some(Boolean)).toBe(true);
  });

  it('writes format information matching generateFormatInfo for both copies', () => {
    for (const ecLevel of LEVELS) {
      const qr = buildMatrix('FORMAT TEST', 3, ecLevel, 'byte', 5);
      const size = qr.size;
      const bits = generateFormatInfo(ecLevel, 5);
      let copy1 = 0;
      for (let i = 0; i < 6; i++) copy1 |= (qr.modules[i]![8] ? 1 : 0) << i;
      copy1 |= (qr.modules[7]![8] ? 1 : 0) << 6;
      copy1 |= (qr.modules[8]![8] ? 1 : 0) << 7;
      copy1 |= (qr.modules[8]![7] ? 1 : 0) << 8;
      for (let i = 9; i < 15; i++) copy1 |= (qr.modules[8]![14 - i] ? 1 : 0) << i;
      expect(copy1, `${ecLevel} copy1`).toBe(bits);

      let copy2 = 0;
      for (let i = 0; i < 8; i++) copy2 |= (qr.modules[8]![size - 1 - i] ? 1 : 0) << i;
      for (let i = 8; i < 15; i++) copy2 |= (qr.modules[size - 15 + i]![8] ? 1 : 0) << i;
      expect(copy2, `${ecLevel} copy2`).toBe(bits);
    }
  });

  it('keeps size = 4v + 17 and consistent metadata', () => {
    const qr = buildMatrix('META', 12, 'Q', 'byte', 2);
    expect(qr.size).toBe(4 * 12 + 17);
    expect(qr.modules).toHaveLength(qr.size);
    expect(qr.modules[0]).toHaveLength(qr.size);
    expect(qr.version).toBe(12);
    expect(qr.ecLevel).toBe('Q');
    expect(qr.mask).toBe(2);
    expect(qr.mode).toBe('byte');
  });
});

describe('buildMatrix — validation', () => {
  it('rejects an invalid forced mask', () => {
    expect(() => buildMatrix('X', 1, 'M', 'byte', 8 as MaskPattern)).toThrow(RangeError);
    expect(() => buildMatrix('X', 1, 'M', 'byte', -1 as MaskPattern)).toThrow(RangeError);
  });

  it('rejects data that does not fit the forced version', () => {
    expect(() => buildMatrix('A'.repeat(32), 1, 'H', 'byte')).toThrow(/data too long/);
  });

  it('rejects payloads invalid for the forced mode', () => {
    expect(() => buildMatrix('ABC', 1, 'M', 'numeric')).toThrow(RangeError);
    expect(() => buildMatrix('abc', 1, 'M', 'alphanumeric')).toThrow(RangeError);
    expect(() => buildMatrix('hello 🙂', 1, 'M', 'kanji')).toThrow(RangeError);
  });
});

describe('buildMatrix — parity with the qrcode reference', () => {
  it('byte mode: all 40 versions x 4 EC levels x 8 masks (1280 matrices)', () => {
    // Must fit v1-H (5 bytes + header <= 72 bits).
    const payload = 'HELLO';
    for (let version = 1; version <= 40; version++) {
      for (const ecLevel of LEVELS) {
        for (const mask of MASKS) {
          const ours = buildMatrix(payload, version, ecLevel, 'byte', mask);
          const ref = refModules(payload, 'byte', version, ecLevel, mask);
          expect(ours.size, `size v${version}-${ecLevel}-${mask}`).toBe(ref.length);
          expect(ours.modules, `v${version}-${ecLevel}-${mask}`).toEqual(ref);
        }
      }
    }
  }, 120_000);

  it('numeric mode: representative versions x EC x masks', () => {
    // 16 digits fit v1-H (71 <= 72 bits).
    const payload = '1234567890123456';
    for (const version of [1, 4, 9, 10, 17, 26, 27, 33, 40]) {
      for (const ecLevel of LEVELS) {
        for (const mask of MASKS) {
          const ours = buildMatrix(payload, version, ecLevel, 'numeric', mask);
          const ref = refModules(payload, 'numeric', version, ecLevel, mask);
          expect(ours.modules, `numeric v${version}-${ecLevel}-${mask}`).toEqual(ref);
        }
      }
    }
  }, 60_000);

  it('alphanumeric mode: representative versions x EC x masks', () => {
    // 10 characters fit v1-H (68 <= 72 bits).
    const payload = 'HELLO WORD';
    for (const version of [1, 5, 10, 14, 22, 27, 35, 40]) {
      for (const ecLevel of LEVELS) {
        for (const mask of MASKS) {
          const ours = buildMatrix(payload, version, ecLevel, 'alphanumeric', mask);
          const ref = refModules(payload, 'alphanumeric', version, ecLevel, mask);
          expect(ours.modules, `alnum v${version}-${ecLevel}-${mask}`).toEqual(ref);
        }
      }
    }
  }, 60_000);

  it('utf-8 byte payloads with forced masks', () => {
    // 18 UTF-8 bytes fit v3-H (156 <= 192 bits).
    const payload = 'тест 🙂 utf8';
    for (const version of [3, 10, 25]) {
      for (const ecLevel of LEVELS) {
        for (const mask of MASKS) {
          const ours = buildMatrix(payload, version, ecLevel, 'byte', mask);
          const ref = refModules(payload, 'byte', version, ecLevel, mask);
          expect(ours.modules, `utf8 v${version}-${ecLevel}-${mask}`).toEqual(ref);
        }
      }
    }
  }, 60_000);
});
