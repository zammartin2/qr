# Performance

**Русская версия:** [ru/performance.md](ru/performance.md)

## Methodology

Run the benchmark suite with:

```bash
npm run bench  # builds dist/ first, then runs scripts/bench.mjs
```

The currently documented benchmark procedure uses:

- 10,000 iterations per input after a 500-iteration warm-up.
- Identical inputs for `@fab-orbita/qr` and `qrcode@1.5.4` (see `scripts/bench.mjs` for the exact corpus).
- Error correction level `M`, with automatic version and mask selection for both libraries.
- Results appended to `benchmarks/history.json`.

The figures below are from **two recorded benchmark runs**, not a statistically controlled series. They should not be interpreted as evidence of a stable speed advantage or regression.

## Recorded results

Environment reported for these runs: Node.js v22.23.3, Linux x64, 2026-10-08. CPU model, V8 version, commit identifier, and detailed variability statistics were not recorded in the supplied results.

### Run 1 — 00:36 UTC

| Input | `@fab-orbita/qr` | `qrcode` | Comparison |
|---|---:|---:|---|
| URL | 2,235.1 ms | 2,259.6 ms | `fab-qr` 1.1% faster |
| English text | 4,313.3 ms | 4,440.8 ms | `fab-qr` 2.9% faster |
| 40 digits | 2,281.4 ms | 2,187.5 ms | `fab-qr` 4.3% slower |

### Run 2 — 05:39 UTC

| Input | `@fab-orbita/qr` | `qrcode` | Comparison |
|---|---:|---:|---|
| URL | 2,411.8 ms | 2,392.6 ms | `fab-qr` 0.8% slower |
| English text | 4,166.8 ms | 4,660.6 ms | `fab-qr` 10.6% faster |
| 40 digits | 2,335.5 ms | 2,195.2 ms | `fab-qr` 6.4% slower |

### Interpretation

Across these two runs, overall throughput was broadly comparable to `qrcode@1.5.4`:

- **URL:** near parity; the lead changed direction between runs.
- **English text:** `fab-qr` was faster in both runs, but the observed advantage varied considerably (approximately 2.9–10.6% measured against `qrcode` time).
- **Numeric:** `fab-qr` was slower in both runs (approximately 4.3–6.4% measured against `qrcode` time). This is a **repeatable observation in this small sample**, not yet proof that the numeric encoder is the cause or that the difference is statistically significant.

Individual measured timings changed by as much as approximately 8% between the two runs (URL workload for `fab-qr`). This is **observed run-to-run variation**, not an established ±8% noise bound. More independent repetitions on controlled hardware are required to estimate variability and draw reliable conclusions.

**Conclusion:** The available data supports describing performance as broadly *on par* with the reference, with a possible numeric-workload disadvantage worth investigating. Avoid advertising a stable `1.12× faster` claim on the basis of a single run.

## Bundle size

`npm run analyze` is the CI size gate: the gzip size of each artifact must be at most **100 KB**. Raw, gzip, and Brotli sizes are reported for each entry. `size-limit` is retained for local inspection only, with an informational 250 KB raw budget per entry.

| Artifact | Raw | Gzip | Brotli |
|---|---:|---:|---:|
| `dist/index.js` (universal, ESM) | 173.8 KB | 45.5 KB | 41.6 KB |
| `dist/index.cjs` (universal, CJS) | 174.8 KB | 46.0 KB | 42.1 KB |
| `dist/index.node.js` (Node, ESM) | 173.7 KB | 45.3 KB | 41.5 KB |
| `dist/index.node.cjs` (Node, CJS) | 175.0 KB | 45.9 KB | 42.0 KB |
| `dist/index.browser.js` (browser, ESM) | 173.8 KB | 45.5 KB | 41.6 KB |
| `dist/index.browser.cjs` (browser, CJS) | 174.8 KB | 46.0 KB | 42.1 KB |

The `.d.ts` and `.d.cts` files add approximately 7 KB each and are not gated by `analyze.mjs`.

Since v1.1.0, the kanji (Unicode → Shift JIS) table is a `Uint16Array` literal (6,953 entries), rather than base64 decoded with `Buffer`, to support browser runtimes. The previously reported approximate raw bundle size rose from 88 KB to 174 KB; gzip size rose from 39 KB to 46 KB, a net increase of approximately 7 KB.

## Optimisations already in place

- **GF(256) tables:** a precomputed 512-entry antilog table avoids modulo operations in the multiplication hot path.
- **Reed–Solomon generator polynomials:** memoized by EC length, avoiding repeated construction for each block.
- **N3 penalty:** rolling 11-bit windows scan rows and columns in linear time.
- **Mask candidates:** apply/unapply XOR masking rather than copying entire matrices; penalties include format bits.
- **SVG:** horizontal runs of dark modules are merged into a single `<path>`.
- **PNG:** Node uses `node:zlib` with compression level 9; browser uses `CompressionStream('deflate')` with the reader attached before writing.

## Memory

A version-40 QR symbol contains 177 × 177 modules. Peak allocation is described as a few megabytes, primarily for the boolean matrix and intermediate bit arrays. Persistent caches consist of Reed–Solomon generator polynomials and GF(256) tables. These are implementation estimates, not measured memory benchmarks.

## Improving benchmark reproducibility

The current two-run history is useful for an initial comparison, but it is not sufficient for regression detection. Future updates to `scripts/bench.mjs` and `benchmarks/history.json` should consider recording:

1. **Identity:** schema version, timestamp, package version, Git commit, and dirty-worktree status.
2. **Environment:** Node and V8 versions, OS/architecture, CPU model, and whether the run occurred in CI.
3. **Configuration:** warm-up iterations, measured iterations per input, independent repetitions, and exact workload identifiers.
4. **Statistics:** per-repetition timings plus median and variability; derived ratios should state their direction (for example, `fabQrMs / qrcodeMs`, where values below 1 mean `fab-qr` is faster).
5. **Baseline:** an explicitly identified release or commit, measured under comparable conditions.
6. **Retention and schema:** a documented JSON schema and a history retention policy or archived CI artifacts.

Do **not** populate new statistical fields with invented values or treat two historical runs as sufficient to calculate robust dispersion estimates. A performance-regression CI gate should only be introduced after the benchmark has been validated for repeatability on comparable hardware.

## Reproducing

```bash
git clone https://github.com/zammartin2/qr
cd qr
npm install
npm run bench      # appends a new entry to benchmarks/history.json
npm run analyze
```

Commit updated `benchmarks/history.json` when a new recorded run is intended to become part of the project's tracked performance history.

---

Applies to `@fab-orbita/qr` v1.1.0. See [CHANGELOG.md](../CHANGELOG.md) for release history.
