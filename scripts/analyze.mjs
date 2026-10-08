#!/usr/bin/env node
/**
 * Size gate: prints raw / gzip / brotli for every build artifact and fails
 * (exit 1) when the gzip size of any file exceeds the 100 KB budget.
 *
 * This is the single authoritative size check (size-limit stays informational
 * because @size-limit/file cannot be configured for gzip in the config file).
 */
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_GZIP = 100 * 1024;

const ENTRIES = ['index', 'index.node', 'index.browser'];
const FORMATS = ['js', 'cjs'];

let failed = false;
const kb = (n) => (n / 1024).toFixed(1);

for (const entry of ENTRIES) {
  for (const format of FORMATS) {
    const rel = `dist/${entry}.${format}`;
    const path = join(root, rel);
    if (!existsSync(path)) {
      console.error(`missing artifact: ${rel} (run npm run build first)`);
      failed = true;
      continue;
    }
    const raw = readFileSync(path);
    const gz = gzipSync(raw, { level: 9 });
    const br = brotliCompressSync(raw, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 9 },
    });
    console.log(
      `${rel.padEnd(24)} raw ${kb(raw.length).padStart(7)} KB, ` +
        `gzip ${kb(gz.length).padStart(6)} KB, brotli ${kb(br.length).padStart(6)} KB`,
    );
    if (gz.length > MAX_GZIP) {
      console.error(`FAIL: ${rel} gzip ${kb(gz.length)} KB exceeds ${kb(MAX_GZIP)} KB budget`);
      failed = true;
    }
  }
}

// Sourcemaps are informational only.
for (const entry of ENTRIES) {
  const rel = `dist/${entry}.js.map`;
  const path = join(root, rel);
  if (existsSync(path)) {
    console.log(`${rel.padEnd(24)} raw ${kb(readFileSync(path).length).padStart(7)} KB (info)`);
  }
}

if (failed) {
  console.error('\nanalyze FAILED');
  process.exit(1);
}
console.log('\nanalyze OK — all entries within the gzip budget');
