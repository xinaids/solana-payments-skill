---
description: "Scaffold a Solana Pay checkout (transfer or transaction request) with the server-side verification endpoint wired in"
---

You are scaffolding a Solana Pay checkout. Generate acceptance **and** verification together —
never the create-URL path alone.

## Steps

1. **Classify the flow** (ask only if ambiguous):
   - Fixed price, no server logic → **transfer request** ([transfer-requests.md](../skill/transfer-requests.md))
   - Dynamic price / fee split / sponsored fees → **transaction request** ([transaction-requests.md](../skill/transaction-requests.md))

2. **Confirm parameters**: recipient (native account), stablecoin mint + verified decimals
   ([stablecoins.md](../skill/stablecoins.md)), amount policy (fixed / open), finality
   (`confirmed` vs `finalized`).

3. **Generate**:
   - Order creation: generate a unique `reference`, persist `reference ⇄ orderId` as `pending` with a TTL.
   - The `solana:` URL (or the GET/POST transaction-request endpoints).
   - QR rendering ([frontend.md](../skill/frontend.md)).
   - The verification endpoint using `findReference` + `validateTransfer` ([verification.md](../skill/verification.md)).
   - Idempotent `pending → paid → fulfilled` transition.
   - Status polling on the client.

4. **Generate negative tests**: underpayment, wrong token, replayed reference, poll+webhook race.

5. **Deliver**: exact files, dependency versions, run/test commands. State the finality choice explicitly.

## Guardrails
- Persist the reference **before** showing the URL.
- Amounts in UI units for the URL; base units for instructions; `transferChecked`.
- If the app still uses `@solana/web3.js` elsewhere, isolate that legacy code at the call
  sites that touch `@solana/pay` — see [kit-interop.md](../skill/kit-interop.md). Pure
  `@solana/kit` apps: no boundary needed, `@solana/pay` is already kit-native.
