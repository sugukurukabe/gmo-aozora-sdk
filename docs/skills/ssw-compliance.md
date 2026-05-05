# SSW Compliance Skill

> Use this skill for payroll decisions involving 特定技能 (Specified Skilled
> Worker) visa status checks.

## Legal Framework

Japan's 特定技能 visa program (入管法 第2条の2) requires employers to verify
worker eligibility before each payroll period. Sugukuru dispatches Indonesian
workers to agricultural operations in Kyushu.

## 4-State Residence Status Model

```typescript
type ResidenceStatus =
  | { kind: 'valid'; expiresAt: string }
  | { kind: 'tokurei_kikan'; until: string }
  | { kind: 'expired_no_app' }
  | { kind: 'overdue' };
```

### State Definitions

| Kind | 日本語 | Meaning |
|---|---|---|
| `valid` | 在留資格有効 | Visa valid, work authorized |
| `tokurei_kikan` | 特例期間 | Extension applied, work legally continues |
| `expired_no_app` | 在留期限切れ・申請なし | Visa expired, no renewal application |
| `overdue` | 滞在超過 | Overstay — immigration authority must be notified |

### 特例期間 (tokurei_kikan)

Under 入管法 Article 20-6, when a worker has applied for a visa extension
before the expiry date, they are in 特例期間. During this period:
- Work continuation is explicitly **authorized by law**
- The period lasts until a decision is made on the renewal application
- Payroll transfer proceeds **normally**

**This is often misunderstood.** Never treat `tokurei_kikan` as a reason to
stop payroll — that would violate 労働基準法 Article 24 (timely payment).

## 3-Track Payroll Decision Matrix

```
valid          → execute_transfer
tokurei_kikan  → execute_transfer   (法的に就労継続可)
expired_no_app → stop_work          (就労不可、賃金保留)
overdue        → refer_immigration  (入管法上の通報義務)
```

## Implementation Pattern

```typescript
function getPayrollTrack(status: ResidenceStatus): 'execute' | 'stop_work' | 'refer_immigration' {
  switch (status.kind) {
    case 'valid':
    case 'tokurei_kikan':
      return 'execute';
    case 'expired_no_app':
      return 'stop_work';
    case 'overdue':
      return 'refer_immigration';
    default:
      return assertNever(status); // fails if enum grows without updating this
  }
}
```

## References

- 入管法（出入国管理及び難民認定法）第20条の6 — 特例期間の規定
- 労働基準法 第24条 — 賃金の直接払い・全額払い原則
- 特定技能外国人受入れに関する運用要領（出入国在留管理庁）
