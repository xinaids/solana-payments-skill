# Devnet E2E Proof

Runs the full payment lifecycle against devnet — the exact flow documented
in `skill/verification.md`, actually executed (not just compiled).

## What it proves

```
encodeURL       → builds a valid solana: URL with a unique reference
createTransfer  → constructs the transfer instruction with reference attached
devnet tx       → transaction confirmed on-chain
findReference   → locates the tx by reference key alone (no signature needed)
validateTransfer→ confirms recipient + amount + reference match on-chain
```

## Run it

```bash
cd demo
npm install
npx tsx devnet-e2e.ts
```

No wallet or funded account needed — the script airdrops 0.1 SOL to a
generated keypair automatically. No .env required.

## Expected output

```
────────────────────────────────────────────────────────────
  ✅ E2E PROOF COMPLETE
────────────────────────────────────────────────────────────

  encodeURL       → built a valid solana: URL with a unique reference
  createTransfer  → constructed the transfer instruction with reference attached
  devnet tx       → transaction confirmed on-chain
  findReference   → located the tx by reference key alone (no signature needed)
  validateTransfer→ confirmed recipient + amount + reference match

  Transaction: https://explorer.solana.com/tx/<sig>?cluster=devnet
```
