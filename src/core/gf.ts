/**
 * Galois field GF(256) arithmetic for Reed-Solomon coding.
 *
 * Primitive polynomial: 0x11D (x^8 + x^4 + x^3 + x^2 + 1), as required by
 * ISO/IEC 18004 for QR code error correction.
 *
 * @packageDocumentation
 */

/** Primitive polynomial coefficients (reduced, without the leading x^8 term). */
const PRIMITIVE = 0x11d;

/**
 * Antilog table: `GF_EXP[i] = α^i`. Length 512 so that products never need an
 * explicit modulo (indices up to 254+254 = 508).
 */
export const GF_EXP: Uint8Array = new Uint8Array(512);

/** Log table: `GF_LOG[α^i] = i`. `GF_LOG[0]` is unused. */
export const GF_LOG: Uint8Array = new Uint8Array(256);

(function buildTables(): void {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= PRIMITIVE;
    }
  }
  // Wrap-around half so that EXP[a + b] works without modulo for a+b < 510.
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]!;
  }
})();

/**
 * Multiplication in GF(256).
 *
 * @param a - First operand (0-255)
 * @param b - Second operand (0-255)
 * @returns `a * b` in GF(256)
 */
export function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a]! + GF_LOG[b]!]!;
}

/**
 * Multiplicative inverse in GF(256).
 *
 * @param a - Operand (1-255)
 * @returns `a^-1` such that `a * a^-1 === 1`
 * @throws {RangeError} If `a` is 0 (zero has no inverse)
 */
export function gfInv(a: number): number {
  if (a === 0) {
    throw new RangeError('gfInv: zero has no multiplicative inverse');
  }
  return GF_EXP[255 - GF_LOG[a]!]!;
}

/**
 * Division in GF(256).
 *
 * @param a - Numerator
 * @param b - Denominator (must be non-zero)
 * @returns `a / b` in GF(256)
 * @throws {RangeError} If `b` is 0
 */
export function gfDiv(a: number, b: number): number {
  if (b === 0) {
    throw new RangeError('gfDiv: division by zero');
  }
  if (a === 0) return 0;
  return GF_EXP[(GF_LOG[a]! + 255 - GF_LOG[b]!) % 255]!;
}

/**
 * Exponentiation in GF(256): `α^n`.
 *
 * @param n - Exponent (may be any non-negative integer; reduced mod 255)
 * @returns `α^n`
 */
export function gfPow(n: number): number {
  return GF_EXP[((n % 255) + 255) % 255]!;
}

/**
 * Polynomial multiplication in GF(256).
 *
 * Coefficients are ordered from the highest degree to the constant term
 * (index 0 is the leading coefficient).
 *
 * @param p - First polynomial
 * @param q - Second polynomial
 * @returns Product polynomial
 */
export function gfPolyMul(p: readonly number[], q: readonly number[]): number[] {
  const result = new Array<number>(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) {
    const pi = p[i]!;
    if (pi === 0) continue;
    for (let j = 0; j < q.length; j++) {
      result[i + j]! ^= gfMul(pi, q[j]!);
    }
  }
  return result;
}

/**
 * Evaluates a polynomial in GF(256) using Horner's method.
 *
 * @param p - Polynomial coefficients (highest degree first)
 * @param x - Evaluation point
 * @returns `p(x)` in GF(256)
 */
export function gfPolyEval(p: readonly number[], x: number): number {
  let y = p[0] ?? 0;
  for (let i = 1; i < p.length; i++) {
    y = gfMul(y, x) ^ p[i]!;
  }
  return y;
}
