# Changelog

All notable changes to `@sugukuru/zengin-format` are tracked here.

## 0.4.0

### Added

- Full Zengin fixed-length file generation with header, data, trailer, and end records.
- Shift_JIS/CP932 subset encoding for ASCII and half-width kana.
- `ZenginShorui = '11' | '12'` literal type for payroll and bonus files.
- Golden byte-level regression tests and multi-bank fixtures.
- Package README and npm metadata.

### Security / Correctness

- Every generated record is asserted at exactly 120 bytes.
- No GMO-specific bank code is hardcoded in this package.
