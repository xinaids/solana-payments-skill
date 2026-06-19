# TypeScript Rules — Payments

Auto-loaded for `.ts`/`.tsx` in payment code. Extends core TypeScript rules.

## Money & Amounts
- Never use JS `number` for **on-chain instruction** amounts. Use `bigint` (base units) there.
- For `@solana/pay` calls specifically (`validateTransfer`, `encodeURL`), `Amount` is a plain
  `number` in UI units — do **not** wrap it in `BigNumber`; that type doesn't match and will
  fail TypeScript / coerce to `NaN`.
- Keep UI units and base units in clearly named variables (`uiAmount` vs `baseUnits`).
- Read token decimals on-chain (`getMint` from `@solana/spl-token`, or kit-native `fetchMint`
  from `@solana-program/token`); never hardcode decimals from memory except where verified.
- Prefer the "checked" instruction variant (`transferChecked` / `getTransferCheckedInstruction`)
  over plain `transfer`.

## Verification
- The server is the source of truth. Never fulfill on a client-reported success.
- Always go through `findReference` + `validateTransfer`; do not reimplement their checks.
- Make fulfillment idempotent via an atomic conditional DB update.

## Solana Pay / kit boundary
- `@solana/pay` is kit-native (no `@solana/web3.js` dependency) — use it directly with
  `@solana/kit`'s `Rpc`/`Address`, no wrapper needed.
- If other parts of the codebase still use `@solana/web3.js`, confine **that** legacy code
  behind one boundary module and convert at the edge — base58 **strings** are the lingua
  franca between `PublicKey.toBase58()` and kit's `address()`. See
  [kit-interop.md](../skill/kit-interop.md).

## Secrets
- RPC URLs, sponsor keys, provider API keys, webhook secrets: server-side only, via env. Never in client bundles.

## Errors
- Distinguish `FindReferenceError` (pending, expected) from `ValidateTransferError` (mismatch, suspicious).
- Bound all polling loops with a TTL; expire stale orders.
