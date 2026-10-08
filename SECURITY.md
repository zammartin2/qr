# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 1.x | ✅ |

## Reporting a vulnerability

Please report security vulnerabilities to **security@devorbit.ru** (private
email, not a public issue). Include:

- description of the issue and its impact;
- steps to reproduce or a proof of concept;
- affected versions.

You will receive an acknowledgement within 3 business days and a status
update within 10 business days. Fixes will be released as a patch version of
the affected minor line.

## Scope

This library generates QR code symbols from caller-supplied strings and
writes files to caller-supplied paths. Reports about malicious *content*
encoded into QR symbols (phishing URLs etc.) are out of scope — the library
does not validate or filter payload semantics by design.

Detailed supply-chain notes: [docs/security.md](docs/security.md).
