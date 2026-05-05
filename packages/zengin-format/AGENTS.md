# @sugukuru/zengin-format — Package AGENTS

## Package Purpose

Generate Zengin (全銀協) format fixed-length transfer files for Japanese banks.
This package is **NOT GMO-specific** — it works with any Japanese bank that
uses the Zengin standard (SMBC, MUFG, Mizuho, regional banks, etc.).

## Critical Constraints

### 種別コード (Shorui) — NEVER relax this type

`ZenginShorui = '11' | '12'` is a LOAD-BEARING type.

- `'11'` = 給与振込 (payroll)
- `'12'` = 賞与振込 (bonus)

NEVER:
- Widen to `string`
- Accept `'21'` or any other code outside the standard
- Accept free-form user strings without compile-time validation

If a new shorui code is required due to a spec change, add it explicitly to
the union and document the 全銀協 spec reference in a comment.

### GMO-specific code is FORBIDDEN in this package

This package must be usable by any Japanese bank accepting Zengin format.

**NEVER** in `packages/zengin-format/**`:
- Hardcode `"0310"` (GMO Aozora's bank code)
- Import from `@sugukuru/gmo-aozora-sdk`
- Reference `private:account` or other GMO scope names
- Assume any GMO-specific field layout or default

GMO-specific defaults belong in `packages/core` only.

### Byte-level correctness

- Every data record is exactly **120 bytes** in Shift_JIS encoding
- Text fields use **半角カナ** (half-width katakana) — use the built-in converter
- Numeric fields are right-justified and zero-padded
- Control record (header + trailer) counts must exactly match the data records
- Always verify the output buffer length before returning

### Bank info is always caller-provided

```typescript
// ✅ Correct: caller provides bank info
generateZenginFile({
  sourceBank: { code: '0310', nameKana: 'ｼﾞｰｴﾑｵｰｱｵｿﾞﾗ' },
  items: [...],
  shorui: '11',
});

// ❌ Wrong: hardcoded bank code inside the function
// const sourceBank = { code: '0310', nameKana: 'ｼﾞｰｴﾑｵｰｱｵｿﾞﾗ' }; // FORBIDDEN
```

## Multi-bank Readiness

See `.cursor/rules/51-multi-bank-readiness.mdc` for full guidance.

The design goal: when v1.2 multi-bank abstraction begins, this package requires
zero changes. All GMO-specific concerns are isolated in `packages/core`.

## Reference

- 全銀協標準通信プロトコル仕様書 (see `docs/skills/zengin-format-spec.md` when available)
- GMO Aozora API spec v1.8.0 — bulk transfer section (uses this package's output)
- Test fixtures in `fixtures/` must cite the source PDF URL in the file header
