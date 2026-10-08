/**
 * Reed-Solomon encoding and block interleaving (ISO/IEC 18004, Annex A).
 *
 * @packageDocumentation
 */

import { GF_EXP, gfMul, gfPolyEval, gfPolyMul } from './gf';

/** Memoized generator polynomials keyed by error correction length. */
const generatorCache = new Map<number, number[]>();

/**
 * Builds the Reed-Solomon generator polynomial of degree `nsym`:
 * the product of `(x - α^i)` for `i = 0 .. nsym-1`.
 *
 * @param nsym - Number of error correction codewords (7-30 for QR)
 * @returns Polynomial coefficients, highest degree first (leading coefficient is 1)
 * @throws {RangeError} If `nsym < 1`
 */
export function rsGeneratorPoly(nsym: number): number[] {
  if (!Number.isInteger(nsym) || nsym < 1) {
    throw new RangeError(`rsGeneratorPoly: nsym must be a positive integer, got ${nsym}`);
  }
  const cached = generatorCache.get(nsym);
  if (cached) return cached;

  // g(x) starts as 1 (the polynomial "x^0").
  let g: number[] = [1];
  for (let i = 0; i < nsym; i++) {
    // Multiply by (x - α^i) == (x + α^i) in GF(2^8).
    g = gfPolyMul(g, [1, GF_EXP[i]!]);
  }
  generatorCache.set(nsym, g);
  return g;
}

/**
 * Computes the `nsym` Reed-Solomon error correction codewords for `data`
 * via polynomial division (synthetic division by the generator polynomial).
 *
 * @param data - Data codewords
 * @param nsym - Number of error correction codewords to produce
 * @returns Error correction codewords (length `nsym`)
 * @throws {RangeError} If `nsym < 1` or `data` is empty
 */
export function rsEncode(data: readonly number[], nsym: number): number[] {
  if (data.length === 0) {
    throw new RangeError('rsEncode: data must not be empty');
  }
  const gen = rsGeneratorPoly(nsym);
  const work = new Array<number>(data.length + nsym);
  for (let i = 0; i < data.length; i++) work[i] = data[i]!;
  for (let i = data.length; i < work.length; i++) work[i] = 0;

  for (let i = 0; i < data.length; i++) {
    const coef = work[i]!;
    if (coef === 0) continue;
    for (let j = 1; j < gen.length; j++) {
      work[i + j]! ^= gfMul(gen[j]!, coef);
    }
  }
  return work.slice(data.length);
}

/**
 * Appends error correction codewords to `data`, producing a full block
 * codeword (`data || ec`).
 *
 * @param data - Data codewords of one block
 * @param nsym - Number of error correction codewords per block
 * @returns Full block: data codewords followed by EC codewords
 * @throws {RangeError} If inputs are invalid (see {@link rsEncode})
 */
export function rsEncodeBlock(data: readonly number[], nsym: number): number[] {
  return [...data, ...rsEncode(data, nsym)];
}

/**
 * Interleaves block codewords into the final message sequence.
 *
 * Data codewords are interleaved column-wise across all blocks (blocks that
 * have already exhausted their data codewords are skipped), followed by the
 * EC codewords interleaved column-wise (all blocks have the same EC length).
 *
 * @param blocks - For each block, `[...dataCodewords, ...ecCodewords]`
 * @param dataLengths - Number of data codewords in each block (same length as `blocks`)
 * @returns Interleaved codeword sequence
 * @throws {RangeError} If `blocks` and `dataLengths` differ in length, or a block
 *   is shorter than its declared data length
 */
export function interleaveBlocks(
  blocks: readonly (readonly number[])[],
  dataLengths: readonly number[],
): number[] {
  if (blocks.length !== dataLengths.length) {
    throw new RangeError(
      `interleaveBlocks: ${blocks.length} blocks but ${dataLengths.length} data lengths`,
    );
  }
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i]!.length < dataLengths[i]!) {
      throw new RangeError(`interleaveBlocks: block ${i} shorter than its data length`);
    }
  }

  const result: number[] = [];
  const maxDataLen = Math.max(0, ...dataLengths);

  // Pass 1: data codewords, column-wise across blocks.
  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < blocks.length; b++) {
      if (i < dataLengths[b]!) {
        result.push(blocks[b]![i]!);
      }
    }
  }

  // Pass 2: EC codewords, column-wise across blocks (equal length everywhere).
  const maxEcLen = Math.max(0, ...blocks.map((blk, i) => blk.length - dataLengths[i]!));
  for (let i = 0; i < maxEcLen; i++) {
    for (let b = 0; b < blocks.length; b++) {
      const dataLen = dataLengths[b]!;
      const offset = dataLen + i;
      if (offset < blocks[b]!.length) {
        result.push(blocks[b]![offset]!);
      }
    }
  }

  return result;
}

/**
 * Verifies that a full codeword has all zero syndromes (test helper semantics
 * exposed for the public API surface required by the specification).
 *
 * @param codeword - Full block codeword (`data || ec`)
 * @param nsym - Number of error correction codewords
 * @returns `true` if every syndrome is zero
 */
export function rsCheckSyndromes(codeword: readonly number[], nsym: number): boolean {
  for (let i = 0; i < nsym; i++) {
    if (gfPolyEval(codeword, GF_EXP[i]!) !== 0) return false;
  }
  return true;
}
