import { defineConfig } from 'tsup';

// Three entries. `clean: false` everywhere — tsup runs array configs
// concurrently (Promise.all) and a `clean: true` would race the other
// configs' outputs; dist/ is cleared by the npm build script instead.
export default defineConfig([
  // Universal (default condition) — must stay free of node:* imports.
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    target: 'node18',
    platform: 'neutral',
    clean: false,
    sourcemap: true,
    minify: false,
    outDir: 'dist',
  },
  // Node / Deno / Bun (node, deno, bun conditions).
  {
    entry: { 'index.node': 'src/index.node.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    target: 'node18',
    platform: 'node',
    clean: false,
    sourcemap: true,
    minify: false,
    outDir: 'dist',
  },
  // Browser / Workers / Vercel Edge (browser, workerd, edge-* conditions).
  // platform: browser makes any `node:*` import a hard build error — that is
  // the guard we want.
  {
    entry: { 'index.browser': 'src/index.browser.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    target: 'es2022',
    platform: 'browser',
    clean: false,
    sourcemap: true,
    minify: false,
    outDir: 'dist',
  },
]);
