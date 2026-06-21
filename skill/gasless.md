# Gasless & Sponsored Transactions

The most common payment dead-end: a new user holds USDC but **zero SOL**, so they cannot
pay the network fee and the transaction fails. Fee abstraction removes this wall.

## The Problem

Every Solana transaction needs a fee payer with SOL. A user funded only in stablecoins is
stuck. For consumer payments — especially first-time and emerging-market users — this is a
hard conversion killer.

## Two Approaches

### 1. Fee Sponsorship (Paymaster / Relayer)
Your server (or a paymaster service) is the **fee payer**. The user signs as the token
authority; the sponsor signs as fee payer. Both signatures go on one transaction.

This requires a **transaction request** ([transaction-requests.md](transaction-requests.md)) —
you must build and partially sign server-side.

```ts
// Server: build tx, set sponsor as fee payer, partial-sign, return for user to co-sign.
import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';

const sponsor = Keypair.fromSecretKey(SPONSOR_SECRET); // funded with SOL, kept server-side
const tx = new Transaction({ feePayer: sponsor.publicKey, blockhash, lastValidBlockHeight });
tx.add(transferIx);            // user pays merchant in USDC
tx.partialSign(sponsor);       // sponsor signs the fee

// Return base64; wallet adds the user's signature (token authority) and submits.
const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
```

Guardrails for a sponsor:
- **Scope what you sign.** Inspect the instructions before partial-signing. Never blind-sign
  a client-supplied transaction — you could sponsor an attacker draining their own approvals
  or adding instructions you didn't intend. Build the tx yourself from server state.
- **Rate-limit and cap** sponsored fees per user/order; fees are cheap but abuse compounds.
- **Keep the sponsor key server-side**, rotate it, and fund it with a bounded balance.

### 2. Pay Fees in the Token (Paymaster Charges in Stablecoin)
A paymaster pays SOL fees and is reimbursed in the token the user already holds, atomically
in the same transaction. This is the cleanest UX: the user only ever needs the stablecoin.

**Kora** (`solana-foundation/kora`, MIT) is a fee-abstraction relayer maintained by the
Solana Foundation: a JSON-RPC server that acts as the paymaster, accepting fee payment in an
SPL token your app supports while it pays the actual network fee in SOL. Reach for a
maintained paymaster like this rather than rolling your own signer service.

```ts
import { KoraClient } from '@solana/kora';

const kora = new KoraClient({ rpcUrl: process.env.KORA_RPC_URL! });
// `transaction` is the base64-encoded serialized transaction (string), not a tx object.
const signed = await kora.signTransaction({ transaction: base64Transaction });
```

## Token-2022 Note

If the payment token is Token-2022 with a transfer fee, the sponsor-reimbursement math must
account for the fee skim (see [stablecoins.md](stablecoins.md)). Quote the net.

## When You Don't Need This

- The user already holds SOL (most existing crypto users): skip sponsorship, use a plain
  [transfer request](transfer-requests.md).
- Fees on Solana are sub-cent; sponsorship is a **UX/onboarding** decision, not a cost-saving
  one. Add it when your audience is stablecoin-only or new-to-crypto.

## Decision Guide

| Situation | Approach |
|-----------|----------|
| User has SOL | No sponsorship — transfer request |
| New user, stablecoin only, you eat the fee | Fee sponsorship (server fee payer) |
| You want reimbursement in the token | Token-paying paymaster (e.g. Kora) |
| High volume / don't want to run signers | Managed paymaster service |

## Checklist

- [ ] tx built from **server state**, then partial-signed (never blind-sign client tx)
- [ ] sponsor key server-side, funded with a bounded balance, rotated
- [ ] per-user / per-order caps + rate limits on sponsorship
- [ ] Token-2022 fee math handled if reimbursing in token
- [ ] verification path unchanged — still re-verify on-chain ([verification.md](verification.md))
