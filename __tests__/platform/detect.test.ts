import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasCompressionStream } from '../../src/platform/detect';

describe('hasCompressionStream', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when the global exists (Node 18+)', () => {
    expect(hasCompressionStream()).toBe(true);
  });

  it('returns false when the global is missing', () => {
    vi.stubGlobal('CompressionStream', undefined);
    expect(hasCompressionStream()).toBe(false);
  });

  it('returns false when the global is not a constructor', () => {
    vi.stubGlobal('CompressionStream', 42);
    expect(hasCompressionStream()).toBe(false);
  });
});
