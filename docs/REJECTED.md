# REJECTED.md

This document records feature requests and PRs that were intentionally rejected,
and the reasoning. Helps future contributors understand our boundaries.

## R001: Widen `ZenginShorui` to `string`

**Requested**: Accept any shorui code string to support future codes.
**Decision**: Rejected.
**Reason**: `ZenginShorui = '11' | '12'` is a load-bearing type. If a new
  official code is added by 全銀協, we add it explicitly to the union. Widening
  to `string` removes the compile-time safety that is one of our core advantages.
**Reference**: Rule 03, Rule 13.

## R002: Add `.toExcelRow()` export helper

**Requested**: A helper to format a transfer record for Excel import.
**Decision**: Rejected.
**Reason**: This SDK replaces Excel-driven workflows, not augments them.
  Users should use the Zengin file output or the JSON bulk transfer API.
**Reference**: Rule 03 (Forbidden Pattern 3).

## R003: Add SMBC client in v1.0

**Requested**: A `SmbcClient` class mirroring `GmoAozoraClient`.
**Decision**: Deferred to v1.2, not rejected permanently.
**Reason**: Multi-bank support requires an abstraction layer that we are
  designing for v1.2. Adding it ad-hoc in v1.0 would create technical debt.
  Contributors interested in SMBC support should maintain a separate package
  until the abstraction layer is ready.
**Reference**: Rule 51, ROADMAP v1.2.

## R004: Use `axios` instead of undici/fetch

**Requested**: Replace undici with axios for broader Node.js compatibility.
**Decision**: Rejected.
**Reason**: We target Node.js 20+ and use the built-in `fetch`. Adding axios
  is an unnecessary dependency that conflicts with our "No vendor lock-in"
  design principle (Rule 00, §Core constraints).
**Reference**: Rule 31.
