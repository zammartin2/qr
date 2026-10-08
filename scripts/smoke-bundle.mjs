#!/usr/bin/env node
/**
 * Bundle & exports smoke checks for @fab-orbita/qr.
 *
 * 1. browser + universal DIST entries must bundle for the browser without node:*
 * 2. the node DIST entry must FAIL to bundle for the browser (drift guard)
 * 3. d.ts contract per entry
 * 4. exports-map condition resolution (self-reference)
 * 5. import/require smoke of all entries (esm + cjs)
 * 6. universal qrToFile stub runtime message + qrToPNG async contract
 *
 * Requires `npm run build` to have produced dist/ first.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;

function check(label, ok, detail = '') {
  if (ok) {
    console.log(`  ok   ${label}`);
  } else {
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
    failed = true;
  }
  return ok;
}

function normalize(p) {
  return p.replace(/\\/g, '/');
}

// Matches: from 'node:x', import 'node:x', import('node:x'), require('node:x')
function containsNodeSpecifier(code) {
  return /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']node:/.test(code);
}

// --- preconditions ---------------------------------------------------------

const distFiles = [
  'dist/index.js',
  'dist/index.cjs',
  'dist/index.node.js',
  'dist/index.node.cjs',
  'dist/index.browser.js',
  'dist/index.browser.cjs',
  'dist/index.d.ts',
  'dist/index.node.d.ts',
  'dist/index.browser.d.ts',
];
const missing = distFiles.filter((f) => !existsSync(join(root, f)));
if (missing.length > 0) {
  console.error('dist/ is not built or incomplete — run `npm run build` first.');
  console.error('Missing:', missing.join(', '));
  process.exit(1);
}

// --- 1. browser bundle -----------------------------------------------------

console.log('\n1) browser bundle (must succeed, no node:*):');
for (const entry of ['dist/index.browser.js', 'dist/index.js']) {
  try {
    const result = await build({
      entryPoints: [join(root, entry)],
      bundle: true,
      write: false,
      platform: 'browser',
      format: 'esm',
      target: 'es2022',
      conditions: ['browser', 'import'],
      logLevel: 'silent',
    });
    const code = result.outputFiles[0].text;
    check(`${entry} bundles`, true);
    check(`${entry} has no node:* imports`, !containsNodeSpecifier(code));
  } catch (error) {
    check(`${entry} bundles`, false, String(error).slice(0, 300));
  }
}

// --- 2. drift guard --------------------------------------------------------

console.log('\n2) node entry must FAIL browser bundling (drift guard):');
try {
  await build({
    entryPoints: [join(root, 'dist/index.node.js')],
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    conditions: ['browser', 'import'],
    logLevel: 'silent',
  });
  check('node entry rejected by browser bundling', false, 'build unexpectedly succeeded');
} catch {
  check('node entry rejected by browser bundling', true);
}

// --- 3. d.ts contract ------------------------------------------------------

console.log('\n3) d.ts contract:');
const dts = {
  node: readFileSync(join(root, 'dist/index.node.d.ts'), 'utf8'),
  browser: readFileSync(join(root, 'dist/index.browser.d.ts'), 'utf8'),
  universal: readFileSync(join(root, 'dist/index.d.ts'), 'utf8'),
};
check('index.node.d.ts has qrToFile', dts.node.includes('qrToFile'));
check('index.node.d.ts has Buffer return', dts.node.includes('Buffer'));
check(
  'index.node.d.ts has NO Promise<Uint8Array> png',
  !dts.node.includes('Promise<Uint8Array>'),
);
check('index.d.ts has qrToFile (stub)', dts.universal.includes('qrToFile'));
check(
  'index.d.ts has async png (Promise<Uint8Array>)',
  dts.universal.includes('Promise<Uint8Array>'),
);
check('index.browser.d.ts has qrToFile (stub)', dts.browser.includes('qrToFile'));
check(
  'index.browser.d.ts has async png',
  dts.browser.includes('Promise<Uint8Array>'),
);

// --- 4. exports condition resolution --------------------------------------

console.log('\n4) exports condition resolution (self-reference):');
const expected = {
  node: 'dist/index.node.cjs',
  bun: 'dist/index.node.cjs',
  deno: 'dist/index.node.cjs',
  workerd: 'dist/index.browser.cjs',
  'edge-light': 'dist/index.browser.cjs',
  'edge-runtime': 'dist/index.browser.cjs',
  browser: 'dist/index.browser.cjs',
};
for (const [condition, file] of Object.entries(expected)) {
  try {
    const out = execFileSync(
      process.execPath,
      [`--conditions=${condition}`, '-e', "console.log(require.resolve('@fab-orbita/qr'))"],
      { cwd: root, encoding: 'utf8' },
    ).trim();
    check(
      `--conditions=${condition}`,
      normalize(out).endsWith(file),
      `got ${out}`,
    );
  } catch (error) {
    check(`--conditions=${condition}`, false, String(error).slice(0, 200));
  }
}

// No --conditions flag: Node always activates the `node` condition, so this
// resolves to the node entry, not to the `default` exports entry. This is
// expected — `default` is a fallback for non-Node tooling only.
try {
  const out = execFileSync(
    process.execPath,
    ['-e', "console.log(require.resolve('@fab-orbita/qr'))"],
    { cwd: root, encoding: 'utf8' },
  ).trim();
  check(
    'no conditions (Node default → node entry)',
    normalize(out).endsWith('dist/index.node.cjs'),
    `got ${out}`,
  );
} catch (error) {
  check('no conditions (Node default → node entry)', false, String(error).slice(0, 200));
}

for (const subpath of ['@fab-orbita/qr/node', '@fab-orbita/qr/browser']) {
  try {
    const out = execFileSync(
      process.execPath,
      ['-e', `console.log(require.resolve('${subpath}'))`],
      { cwd: root, encoding: 'utf8' },
    ).trim();
    check(`subpath ${subpath}`, existsSync(out), out);
  } catch (error) {
    check(`subpath ${subpath}`, false, String(error).slice(0, 200));
  }
}

// --- 5. import / require smoke --------------------------------------------

console.log('\n5) import/require smoke of all entries:');
for (const file of ['index.cjs', 'index.node.cjs', 'index.browser.cjs']) {
  try {
    execFileSync(process.execPath, ['-e', `require('./dist/${file}')`], {
      cwd: root,
      stdio: 'pipe',
    });
    check(`require(dist/${file})`, true);
  } catch (error) {
    check(`require(dist/${file})`, false, String(error).slice(0, 200));
  }
}
for (const file of ['index.js', 'index.node.js', 'index.browser.js']) {
  try {
    execFileSync(
      process.execPath,
      ['--input-type=module', '-e', `await import('./dist/${file}')`],
      { cwd: root, stdio: 'pipe' },
    );
    check(`import(dist/${file})`, true);
  } catch (error) {
    check(`import(dist/${file})`, false, String(error).slice(0, 200));
  }
}

// --- 6. runtime contracts on the universal entry --------------------------

console.log('\n6) universal entry runtime contracts:');
try {
  const mod = await import(pathToFileURL(join(root, 'dist/index.js')).href);

  // qrToFile must be a stub that throws, mentioning the node subpath and docs.
  try {
    const qr = mod.generateQR('test');
    await mod.qrToFile(qr, 'x.png');
    check('qrToFile stub throws', false, 'resolved instead of throwing');
  } catch (error) {
    const message = String(error?.message ?? error);
    check('stub mentions subpath', message.includes('@fab-orbita/qr/node'), message);
    check('stub mentions docs link', message.includes('docs/browser.md'), message);
  }

  // qrToPNG on the universal entry is async and returns Uint8Array.
  try {
    const qr = mod.generateQR('test');
    const png = await mod.qrToPNG(qr, { scale: 2 });
    check('qrToPNG returns Uint8Array', png instanceof Uint8Array);
    check('qrToPNG is non-empty', png.length > 0);
  } catch (error) {
    check('qrToPNG async contract', false, String(error).slice(0, 200));
  }
} catch (error) {
  check('universal entry loads in Node', false, String(error).slice(0, 200));
}

// --- result ----------------------------------------------------------------

if (failed) {
  console.error('\nsmoke-bundle FAILED');
  process.exit(1);
}
console.log('\nsmoke-bundle OK');