import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as {
  main: string;
  module: string;
  types: string;
  exports: Record<string, unknown>;
  files: string[];
  version: string;
};

interface Branch {
  types?: string;
  import?: string;
  require?: string;
  default?: string;
}

function branch(entry: unknown): Branch {
  expect(entry).toBeTypeOf('object');
  return entry as Branch;
}

describe('package.json fields (legacy bundlers)', () => {
  it('main/module/types point at the universal entry', () => {
    expect(pkg.main).toBe('./dist/index.cjs');
    expect(pkg.module).toBe('./dist/index.js');
    expect(pkg.types).toBe('./dist/index.d.ts');
  });

  it('has a semver version and ships the expected files', () => {
    // Version must be a valid semver, but the test does not pin a specific
    // value — bumping the version must not require editing this test.
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/);

    // dist is shipped via explicit globs — sourcemaps (*.map) are NOT shipped.
    expect(pkg.files.some((f) => f.startsWith('dist/'))).toBe(true);
    expect(pkg.files.some((f) => f.endsWith('.map'))).toBe(false);

    // Docs and top-level files that must be in the tarball.
    expect(pkg.files).toContain('docs');
    expect(pkg.files).toContain('README.md');
    expect(pkg.files).toContain('README.ru.md');
    expect(pkg.files).toContain('LICENSE');
    expect(pkg.files).toContain('CHANGELOG.md');

    // Nothing that should stay out of the tarball.
    expect(pkg.files).not.toContain('src');
    expect(pkg.files).not.toContain('__tests__');
    expect(pkg.files).not.toContain('scripts');
    expect(pkg.files).not.toContain('benchmarks');
  });
});

describe('exports map shape', () => {
  const root = pkg.exports['.'] as Record<string, Branch>;
  const conditionOrder = [
    'bun',
    'workerd',
    'edge-light',
    'edge-runtime',
    'deno',
    'browser',
    'node',
    'default',
  ];

  it('lists conditions in priority order (bun first, default last)', () => {
    expect(Object.keys(root)).toEqual(conditionOrder);
  });

  it('types is the first key of every branch', () => {
    for (const name of conditionOrder) {
      const keys = Object.keys(root[name]!);
      expect(keys[0], name).toBe('types');
    }
  });

  it('every branch splits import (.js) and require (.cjs)', () => {
    const expectedFile: Record<string, string> = {
      bun: 'index.node',
      workerd: 'index.browser',
      'edge-light': 'index.browser',
      'edge-runtime': 'index.browser',
      deno: 'index.node',
      browser: 'index.browser',
      node: 'index.node',
      default: 'index',
    };
    for (const name of conditionOrder) {
      const b = root[name]!;
      const base = expectedFile[name]!;
      expect(b.import, name).toBe(`./dist/${base}.js`);
      expect(b.require, name).toBe(`./dist/${base}.cjs`);
      expect(b.types, name).toBe(`./dist/${base}.d.ts`);
    }
  });

  it('defines the ./node and ./browser subpaths', () => {
    const nodeSub = branch(pkg.exports['./node']);
    expect(nodeSub.types).toBe('./dist/index.node.d.ts');
    expect(nodeSub.import).toBe('./dist/index.node.js');
    expect(nodeSub.require).toBe('./dist/index.node.cjs');

    const browserSub = branch(pkg.exports['./browser']);
    expect(browserSub.types).toBe('./dist/index.browser.d.ts');
    expect(browserSub.import).toBe('./dist/index.browser.js');
    expect(browserSub.require).toBe('./dist/index.browser.cjs');

    expect(pkg.exports['./package.json']).toBe('./package.json');
  });
});
