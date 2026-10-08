import { afterEach, describe, expect, it, vi } from 'vitest';
import { inflateSync } from 'node:zlib';
import { deflate } from '../../src/platform/deflate-browser';

function randomBytes(length: number, seed = 1): Uint8Array {
  const out = new Uint8Array(length);
  let s = seed;
  for (let i = 0; i < length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out[i] = s & 0xff;
  }
  return out;
}

describe('deflate (CompressionStream)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('produces a zlib stream that inflates back to the input', async () => {
    const data = randomBytes(4096, 7);
    const compressed = await deflate(data);
    const round = new Uint8Array(inflateSync(compressed));
    expect(round).toEqual(data);
  });

  it('starts with the zlib header (78 xx) expected by PNG IDAT', async () => {
    const compressed = await deflate(randomBytes(1024));
    expect(compressed[0]).toBe(0x78);
  });

  it('handles large payloads without deadlocking (v40/scale4 raw ~548 KB)', async () => {
    // Regression: awaiting write() before attaching a reader stalls above the
    // stream high-water mark. The reader-first pattern must survive ~600 KB.
    const data = randomBytes(600 * 1024, 42);
    const compressed = await deflate(data);
    const round = new Uint8Array(inflateSync(compressed));
    expect(round.length).toBe(data.length);
    expect(round[0]).toBe(data[0]);
    expect(round[round.length - 1]).toBe(data[data.length - 1]);
  }, 30_000);

  it('throws a descriptive error when CompressionStream is unavailable', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    const data = new Uint8Array([1, 2, 3]);
    await expect(deflate(data)).rejects.toThrow(/CompressionStream/);
    await expect(deflate(data)).rejects.toThrow(/Vercel Edge/);
    await expect(deflate(data)).rejects.toThrow(/Safari 16\.4/);
    await expect(deflate(data)).rejects.toThrow(/docs\/browser\.md/);
  });
});
