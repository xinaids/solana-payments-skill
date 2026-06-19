---
description: "Run payment-flow tests including negative cases (underpayment, replay, wrong mint/token, race)"
---

You are testing payment flows. The happy path is not enough — the **negative** cases are
where money is lost. Use LiteSVM/Mollusk or a devnet/Surfpool fork (see core `testing.md`).

## Required test cases

| Case | Expectation |
|------|-------------|
| Correct payment | order → `paid` → fulfilled exactly once |
| Underpayment (amount too low) | NOT fulfilled (`validateTransfer` fails) |
| Wrong SPL token | NOT fulfilled |
| Wrong recipient | NOT fulfilled |
| Replayed reference across two orders | fulfilled at most once |
| Poller + webhook fire together | fulfilled exactly once (idempotency) |
| No payment within TTL | order → `expired` |
| Token-2022 transfer-fee token | net amount handled correctly, no false negative |
| High-value with `finalized` | not fulfilled until finalized |

## Steps
1. Detect the stack (Anchor/TS, kit/web3.js) and test runner.
2. Generate fixtures: orders with unique references; a funded payer; the merchant ATA.
3. Implement the cases above; assert state transitions, not just balances.
4. Run; on a second identical failure, STOP and report (Two-Strike Rule).
