# Security

**Русская версия:** [ru/security.md](ru/security.md)

## Reporting a vulnerability

Report security issues privately to **security@devorbit.ru**. Please include a description of the issue, steps to reproduce, affected versions, and any known impact. You will receive an acknowledgement within 3 business days.

Do not open a public GitHub issue for security-sensitive reports.

The formal policy lives in [SECURITY.md](../SECURITY.md) at the repository root.

## Threat model

This is a local library, not a service. It assumes the caller controls the input and the output path. It does not sandbox, rate-limit, or validate payload semantics — encoding a phishing URL in a QR symbol is out of scope by design (see [SECURITY.md](../SECURITY.md)).

## Supply chain

- **Zero runtime dependencies.** The published package executes only its own code plus Node.js built-ins: `node:zlib` (PNG compression), `node:fs/promises` and `node:path` (`qrToFile`), `node:buffer` (Node PNG entry). `npm audit --omit=dev` on a clean install has nothing to audit.
- **Dev dependencies** (TypeScript, tsup, vitest, eslint, typedoc, size-limit, `qrcode` for cross-check tests) affect development and CI only. They are not bundled into `dist/`, and `node_modules` is never published.
- **Published artifacts** are `dist/`, `docs/`, `README.md`, `LICENSE`, `CHANGELOG.md` and `package.json` — verify locally with `npm pack --dry-run`.
- **Lockfile committed.** `package-lock.json` is committed, so `npm ci` installs an exact, reproducible dev dependency tree in CI.
- **Reproducible generated tables.** The EC block table and the kanji (Unicode → Shift JIS) table are produced by committed scripts (`scripts/gen-ec-table.mjs`, `scripts/gen-kanji-map.mjs`) and verified by tests against independent oracles on every CI run.
- **CI hardening.** GitHub Actions workflows use pinned action **major versions** (`actions/checkout@v4`, etc. — not SHAs), run the test job on a 3-OS × 3-Node matrix, and publish only from the `Publish` workflow on `release: published`, using `NPM_TOKEN`. The `bench`, `decode`, `bun` and `deno` jobs run on Ubuntu only. npm provenance (`--provenance`) is not currently enabled.
- **Audit gate.** CI runs `npm audit --omit=dev` on a clean install; it is expected to pass with zero findings.

## Runtime attack surface

- Input is a plain JS string, encoded as UTF-8. `Buffer` / `Uint8Array` inputs are not accepted — callers must decode first. There is no `eval`, no dynamic import of user data, no shell-out.
- **Oversized input** fails with `RangeError` at version selection. A service exposing `generateQR` to untrusted input should cap the input length before calling: QR capacity tops out at 2 953 bytes (v40, EC L), so anything larger is guaranteed to fail — but the failure happens after the input has been copied into internal buffers.
- `qrToFile` writes only to the path the caller supplies. Path validation is the caller's responsibility (it is a local library, not a service).
- **SVG colours** are XML-escaped, so untrusted `dark`/`light` values cannot inject markup through `<`, `>`, `&`, `"`, `'`. Note that SVG colours accept any CSS colour string — including `url(...)` — so callers who inject the SVG into a live DOM should treat colour strings as untrusted input.
- **PNG colours** go through a strict `#RGB` / `#RRGGBB` parser; anything else throws `RangeError`.
- **No source maps** are emitted in the build (`tsconfig.build.json` sets `sourceMap: false`) — verify with `npm pack --dry-run` before publishing.

## Known CVEs

None as of 2026-10-08. The package has no third-party runtime code to carry CVEs.

---

See [SECURITY.md](../SECURITY.md) for the formal policy. Applies to v1.1.0. See [CHANGELOG.md](../CHANGELOG.md) for history.
