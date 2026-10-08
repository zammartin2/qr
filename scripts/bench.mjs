#!/usr/bin/env node
/**
 * Benchmarks @fab-orbita/qr against the qrcode reference on identical inputs
 * and appends the result to benchmarks/history.json.
 *
 * Run `npm run build` first (or use `npm run bench`).
 *
 * Usage:
 *   node scripts/bench.mjs [--runs=3] [--iterations=10000]
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { execSync } from 'node:child_process';
import { cpus, platform, arch, release } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);
const RUNS = Number(args.runs ?? 3);
const ITERATIONS = Number(args.iterations ?? 10_000);
const WARMUP = 500;
const MAX_HISTORY = 50;

const { generateQR } = await import(join(root, 'dist', 'index.js'));
const { create } = await import('qrcode');

const INPUTS = [
  { label: 'url', text: 'https://example.com/test' },
  { label: 'text', text: 'The quick brown fox jumps over the lazy dog' },
  { label: 'digits', text: '0123456789012345678901234567890123456789' },
];

function timeOnce(fn) {
  for (let i = 0; i < WARMUP; i++) fn();
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) fn();
  return performance.now() - start;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function run(label, fn) {
  const runs = [];
  for (let r = 0; r < RUNS; r++) runs.push(timeOnce(fn));
  const med = median(runs);
  const min = Math.min(...runs);
  const max = Math.max(...runs);
  console.log(
    `${label.padEnd(22)} median ${med.toFixed(1)} ms  (min ${min.toFixed(1)}, max ${max.toFixed(1)}, ${RUNS} runs)`,
  );
  return { median: med, min, max, runs };
}

function readHistory(path) {
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    console.warn(`warning: ${path} is not valid JSON — starting a new history`);
    return [];
  }
}

function gitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  } catch {
    return null;
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

console.log(`@fab-orbita/qr v${pkg.version} · ${RUNS} runs · ${ITERATIONS} iterations · Node ${process.version}\n`);

const results = {
  timestamp: new Date().toISOString(),
  version: pkg.version,
  commit: gitCommit(),
  node: process.version,
  v8: process.versions.v8,
  env: {
    os: `${platform()} ${release()} ${arch()}`,
    cpu: cpus()[0]?.model ?? 'unknown',
  },
  config: { iterations: ITERATIONS, warmup: WARMUP, runs: RUNS },
};

for (const { label, text } of INPUTS) {
  const ours = run(`fab-qr [${label}]`, () => generateQR(text, { ecLevel: 'M' }));
  const theirs = run(`qrcode [${label}]`, () => create(text, { errorCorrectionLevel: 'M' }));
  const ratio = theirs.median / ours.median;
  results[label] = {
    fabQrMs: Number(ours.median.toFixed(1)),
    qrcodeMs: Number(theirs.median.toFixed(1)),
    ratio: Number(ratio.toFixed(3)),
    fabQrRange: [Number(ours.min.toFixed(1)), Number(ours.max.toFixed(1))],
    qrcodeRange: [Number(theirs.min.toFixed(1)), Number(theirs.max.toFixed(1))],
  };
  console.log(
    `  -> ${ratio >= 1 ? `${ratio.toFixed(2)}x faster` : `${(1 / ratio).toFixed(2)}x slower`}\n`,
  );
}

const historyPath = join(root, 'benchmarks', 'history.json');
mkdirSync(dirname(historyPath), { recursive: true });
const history = readHistory(historyPath);
history.push(results);
const trimmed = history.slice(-MAX_HISTORY);
writeFileSync(historyPath, `${JSON.stringify(trimmed, null, 2)}\n`, 'utf8');
console.log(`appended to ${historyPath} (${trimmed.length} entries)`);