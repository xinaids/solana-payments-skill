---
name: solana-payments
description: Production Solana payments — accept, verify, settle, and off-ramp. Extends solana-dev-skill with the full consumer/merchant payment lifecycle: Solana Pay transfer requests and transaction requests, server-side payment verification (findReference/validateTransfer, idempotency, replay protection), stablecoin rails (USDC/USDG/PYUSD + Token-2022 gotchas), gasless/sponsored transactions for users without SOL, merchant backends (order state machines, webhooks, reconciliation), fiat on/off-ramps including Pix (Brazil) via the Solana Developer Platform and ramp providers, and the legacy-web3.js ↔ @solana/pay/@solana/kit interop boundary (Solana Pay is kit-native; the bridge is for code that still uses web3.js). For program development (Anchor, Pinocchio) and core frontend, delegates to solana-dev-skill.
user-invocable: true
---

# Solana Payments Skill

> **Extends**: [solana-dev-skill](../solana-dev/SKILL.md) — Core Solana development (programs, frontend, testing, security)

The kit covers DeFi protocol integrations (swaps, lend, perps via `sendai`) and in-game
purchases (via `solana-game`), but nothing covers the **consumer/merchant payment
lifecycle**: take a real payment, *prove* it happened, settle it in a stablecoin, and get
it to a local bank account. This skill fills that gap.

## What This Skill Is For

Use this skill when the user asks for:

### Accepting Payments
- Solana Pay payment links and QR codes (transfer requests)
- Interactive / dynamic payments where the server composes the transaction (transaction requests)
- Checkout flows, tip jars, paywalls, point-of-sale, invoices, subscriptions
- Mobile payment flows and wallet deep links

### Verifying Payments (the part everyone gets wrong)
- Confirming on-chain that a payment actually settled before releasing goods
- Locating a payment by its `reference` key (`findReference`)
- Validating recipient / amount / token / reference (`validateTransfer`)
- Idempotency, replay protection, double-fulfillment, and race conditions
- Confirmed vs finalized trade-offs for high-value payments

### Settlement & Money Movement
- Stablecoin selection and handling: USDC, USDG, PYUSD (mints, decimals, ATAs)
- Token-2022 payment gotchas (transfer fees, transfer hooks, confidential transfers)
- Gasless / sponsored transactions so users without SOL can still pay
- Fiat on-ramp and off-ramp, including **Pix (Brazil)**, via SDP and ramp providers
- Merchant backends: webhooks, reconciliation, order state machines

### Stack Boundary
- Bridging legacy `@solana/web3.js` code into Solana Pay (which is itself kit-native)

### Program Development (Delegate to Core Skill)
- For Anchor escrow / payment programs → [programs-anchor.md](../solana-dev/programs-anchor.md)
- For high-performance payment programs → [programs-pinocchio.md](../solana-dev/programs-pinocchio.md)
- For client wallet/connection patterns → [frontend-framework-kit.md](../solana-dev/frontend-framework-kit.md)

## Default Stack Decisions (Opinionated, 2026)

### 1) Solana Pay library
- `@solana/pay` for URL construction, parsing, `findReference`, `validateTransfer`
- `@solana/pay` is kit-native (no web3.js dependency) — use kit's `Rpc`/`address()` directly; only legacy web3.js code in your *own* project needs a bridge ([kit-interop.md](kit-interop.md))

### 2) Default stablecoin
- **USDC** (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, 6 decimals) — deepest liquidity, native issuance
- **USDG** (Global Dollar, Paxos/MAS-regulated) when reward-sharing or regulated rails matter
- Always verify mint + decimals on-chain before trusting any hardcoded value ([stablecoins.md](stablecoins.md))

### 3) Verification posture
- **Never** release goods on a client-reported success — always re-verify server-side against the chain
- Default finality `confirmed`; escalate to `finalized` for high-value orders ([verification.md](verification.md))

### 4) Fees / UX
- Sponsor fees for new users (paymaster) so a user with only USDC can transact ([gasless.md](gasless.md))

### 5) Off-ramp
- Solana Developer Platform (SDP) Payments module for enterprise; ramp providers (Pix/SPEI/SEPA) for last-mile ([fiat-rails.md](fiat-rails.md))

## Operating Procedure

### 1. Classify the Payment Task

| Task | Skill File(s) |
|------|---------------|
| Static link/QR, fixed or open amount | [transfer-requests.md](transfer-requests.md) |
| Server composes a dynamic transaction | [transaction-requests.md](transaction-requests.md) |
| "Did the payment actually go through?" | [verification.md](verification.md) |
| Which stablecoin / decimals / mint / Token-2022 | [stablecoins.md](stablecoins.md) |
| User has no SOL for fees | [gasless.md](gasless.md) |
| Merchant backend, webhooks, orders | [merchant-server.md](merchant-server.md) |
| Cash in / cash out / Pix / KYC | [fiat-rails.md](fiat-rails.md) |
| Checkout UI, QR rendering, polling | [frontend.md](frontend.md) |
| Solana Pay inside a `@solana/kit` app | [kit-interop.md](kit-interop.md) |

### 2. Pick the Right Agent

| Task Type | Agent | Model |
|-----------|-------|-------|
| Payment system design, rail selection, threat model | payments-architect | opus |
| Implement flows, verification, server, frontend | payments-engineer | opus |
| Ramp/KYC/compliance integration, reconciliation | merchant-integration-engineer | sonnet |

### 3. Always-On Rules for Payment Code

These are non-negotiable. They map 1:1 to real money loss.

1. **Verify on-chain, server-side, before fulfillment.** The wallet/client is untrusted.
2. **One unique `reference` per order.** It is the client ID that ties an order to a tx.
3. **`validateTransfer` checks amount + recipient + token + reference.** Do not hand-roll it.
4. **Idempotent fulfillment.** Polling and webhooks can both fire — fulfill exactly once.
5. **Mind decimals and Token-2022 transfer fees.** Received amount can be less than sent.
6. **Confirmed ≠ final.** Pick finality by value at risk.

### 4. Deliverables

When implementing, provide:
- Exact files changed with clear diffs
- `package.json` / Cargo deps and versions
- The verification path (not just the "happy" create-URL path)
- Test commands and at least one negative test (underpayment, replay, wrong mint)

---

## Progressive Disclosure (Read When Needed)

### Accepting Payments
- [transfer-requests.md](transfer-requests.md) — non-interactive `solana:` URLs, QR codes, `encodeURL`, `parseURL`
- [transaction-requests.md](transaction-requests.md) — interactive server GET/POST, dynamic transaction composition

### Verifying & Settling
- [verification.md](verification.md) — `findReference`, `validateTransfer`, idempotency, replay, finality, race conditions
- [stablecoins.md](stablecoins.md) — USDC / USDG / PYUSD, mints, decimals, ATAs, Token-2022 gotchas
- [gasless.md](gasless.md) — sponsored/fee-abstracted transactions, paymaster patterns

### Production & Money Movement
- [merchant-server.md](merchant-server.md) — order state machine, webhooks (Helius), reconciliation, idempotency keys
- [fiat-rails.md](fiat-rails.md) — on/off-ramp, **Pix (Brazil)**, SDP, ramp-provider comparison, KYC/compliance
- [frontend.md](frontend.md) — checkout UX, QR rendering, polling vs websocket, mobile deep links

### Stack Boundary & Reference
- [kit-interop.md](kit-interop.md) — legacy web3.js ↔ `@solana/pay`/`@solana/kit` boundary patterns (Solana Pay is kit-native)
- [resources.md](resources.md) — curated, current links

### Core Solana Dev Skills (from solana-dev-skill)
> Provided by [solana-dev-skill](../solana-dev/SKILL.md) — install if not present
- [frontend-framework-kit.md](../solana-dev/frontend-framework-kit.md) — wallet connection, hooks
- [kit-web3-interop.md](../solana-dev/kit-web3-interop.md) — Kit ↔ web3.js boundary
- [programs-anchor.md](../solana-dev/programs-anchor.md) — Anchor (escrow/payment programs)
- [security.md](../solana-dev/security.md) — program + client security checklist
- [testing.md](../solana-dev/testing.md) — LiteSVM, Mollusk, Surfpool

---

## Task Routing Guide

| User asks about... | Primary skill file(s) |
|--------------------|----------------------|
| Payment link / QR code | transfer-requests.md |
| Open-amount / "enter tip" link | transfer-requests.md |
| Dynamic price, coupons, server-built tx | transaction-requests.md |
| "How do I know they paid?" | verification.md |
| Find tx by reference | verification.md |
| Prevent double-charging / double-fulfillment | verification.md, merchant-server.md |
| Confirmed vs finalized | verification.md |
| USDC vs USDG vs PYUSD | stablecoins.md |
| Token-2022 / transfer fee on payments | stablecoins.md |
| User has no SOL | gasless.md |
| Sponsored / gasless transaction | gasless.md |
| Webhooks for payment events | merchant-server.md |
| Reconcile payments to orders | merchant-server.md |
| Subscriptions / recurring | merchant-server.md |
| Convert crypto → BRL / Pix | fiat-rails.md |
| On-ramp / off-ramp / KYC | fiat-rails.md |
| Solana Developer Platform (SDP) | fiat-rails.md |
| Checkout page / QR component | frontend.md |
| Mobile wallet deep link | frontend.md |
| Using Solana Pay with @solana/kit | kit-interop.md |
| Escrow / on-chain payment program | solana-dev → programs-anchor.md |
| Client wallet connection | solana-dev → frontend-framework-kit.md |
| Payment program security review | solana-dev → security.md |

---

## Commands

| Command | Description |
|---------|-------------|
| /scaffold-checkout | Generate a Solana Pay checkout (link or QR) + verification endpoint |
| /verify-payment | Build/inspect the server-side verification path for an order |
| /test-payments | Run payment flow tests incl. negative cases (underpay, replay, wrong mint) |
| /quick-commit | Quick commit with conventional messages |

## Agents

| Agent | Purpose |
|-------|---------|
| **payments-architect** | Payment system design, rail/stablecoin selection, threat model |
| **payments-engineer** | Implement transfer/transaction requests, verification, server, frontend |
| **merchant-integration-engineer** | Ramp/KYC/compliance integration, reconciliation, webhooks |
