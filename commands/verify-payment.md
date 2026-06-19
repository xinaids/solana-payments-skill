---
description: "Build or audit the server-side payment verification path for an order"
---

You are building or auditing payment **verification** — the highest-stakes path. Reference
[verification.md](../skill/verification.md).

## If building
1. Confirm a unique `reference` exists per order and is persisted.
2. Implement `findReference(rpc, reference, { commitment })` → `FindReferenceError` = pending.
   `rpc` is a kit `Rpc` from `createSolanaRpc()` — not a `@solana/web3.js` `Connection`.
3. Implement `validateTransfer(...)` checking recipient, amount, splToken, reference.
4. Implement atomic, idempotent `pending → paid → fulfilled`.
5. Choose finality by value at risk; state it explicitly.
6. Handle Token-2022 fee skim if the token uses transfer fees ([stablecoins.md](../skill/stablecoins.md)).

## If auditing, check for these failure modes
- [ ] Client-trusted success (fulfilling without on-chain re-verification) — CRITICAL
- [ ] Reused / non-unique reference
- [ ] Hand-rolled amount/recipient/token check instead of `validateTransfer`
- [ ] Non-idempotent fulfillment (poll + webhook can double-fulfill)
- [ ] UI-unit vs base-unit confusion
- [ ] `confirmed` used before an irreversible step that needs `finalized`
- [ ] Unbounded polling / no TTL / no expiry
- [ ] Token-2022 transfer fee causing false-negative amount checks
- [ ] A `Connection`/`PublicKey` (web3.js) passed into `findReference`/`validateTransfer` —
      these take kit's `Rpc`/`Address`, not web3.js types ([kit-interop.md](../skill/kit-interop.md))
- [ ] `Amount` wrapped in `BigNumber` — `@solana/pay`'s `Amount` type is a plain `number`
- [ ] `{ finality: ... }` instead of `{ commitment: ... }` — the option key is `commitment`

Report findings as a prioritized list (P0 = direct money loss) with the concrete fix for each.
