# Merchant Server

The backend that turns "a transaction landed on-chain" into "this order is fulfilled."
Covers the order lifecycle, how to detect payments reliably, idempotency, and reconciliation.

## Order State Machine

Model the order explicitly. Ambiguous statuses cause double-fulfillment and stuck orders.

```
created ──▶ pending ──▶ paid ──▶ fulfilled
                │
                ├──▶ expired   (no payment within TTL)
                └──▶ flagged   (a tx matched the reference but failed validation)
```

| State | Meaning | Transition guard |
|-------|---------|------------------|
| `created` | order exists, no payment URL yet | — |
| `pending` | URL/QR shown, reference persisted, awaiting payment | set TTL (e.g. 10 min) |
| `paid` | on-chain tx found **and** validated | only from `pending`, atomic |
| `fulfilled` | goods/access delivered | only from `paid`, idempotent |
| `expired` | TTL elapsed with no valid payment | only from `pending` |
| `flagged` | tx matched reference but failed `validateTransfer` | manual review |

Persist `reference`, `recipient`, `amount`, `splToken`, `signature`, timestamps.

## Detecting Payments: Webhooks + Polling (Belt and Suspenders)

Run **both**. Webhooks are fast but can be missed; polling is the reliable backstop. Make
fulfillment idempotent so both firing is harmless ([verification.md](verification.md)).

### Webhooks (fast path) — Helius
Register a webhook on the merchant address (or on the reference, depending on provider
capabilities) to get pushed transaction events. On receipt: run the **same**
`findReference` + `validateTransfer` verification before fulfilling. Never fulfill from
webhook payload alone — verify against chain.

```ts
// POST /api/webhooks/helius
export async function POST(req: Request) {
  verifyWebhookSignature(req);                  // authenticate the webhook source
  const events = await req.json();
  for (const ev of events) {
    const order = await db.orders.findByAddressOrReference(ev);
    if (!order || order.status !== 'pending') continue;
    const result = await verifyOrder(order);  // re-verify on chain (see verification.md)
    if (result.status === 'paid') await markPaidAndFulfill(order.id, result.signature);
  }
  return new Response('ok');
}
```

### Polling (backstop)
A bounded poller checks `pending` orders within their TTL.

```ts
async function pollPending() {
  const orders = await db.orders.where({ status: 'pending', expiresAt: { gt: new Date() } });
  for (const order of orders) {
    const result = await verifyOrder(order);
    if (result.status === 'paid') await markPaidAndFulfill(order.id, result.signature);
  }
  await expireStale(); // pending + past TTL → expired
}
```

> `verifyOrder` (defined in [verification.md](verification.md)) returns
> `{ status: 'paid', signature }` on success — always use that signature, not a stale
> `order.signature` field, which is still `null` for any order this poller is processing.

## Idempotency Keys (for your own API)

If clients call your "create order" or "fulfill" endpoints, accept an `Idempotency-Key`
header and dedupe, so a retried request doesn't create a second order or a second shipment.

## Reconciliation

Daily (or continuous) reconciliation catches drift between chain and database:

1. List `paid`/`fulfilled` orders for the window.
2. For each, confirm the recorded `signature` still exists and is finalized.
3. Sum on-chain receipts to the merchant ATA for the window; compare to booked revenue.
4. Surface mismatches: orphan payments (tx with a known reference but no `paid` order),
   missing payments, or amount discrepancies (possible Token-2022 fee skim —
   [stablecoins.md](stablecoins.md)).

Orphan payments are common when a user pays after expiry. Decide policy: auto-refund,
auto-fulfill late, or manual review.

## Subscriptions / Recurring

Solana has no native "pull" payment. Options:
- **Reminder + new request** each cycle (simplest; user re-approves).
- **Delegated allowance**: user approves a token delegate up to a cap; your program/relayer
  pulls within the cap each period. Requires an on-chain program — delegate to
  `programs-anchor.md`. Treat the delegate as a security-sensitive component.

## Hardening

- Authenticate webhooks (signature/secret); never trust unsigned payloads.
- Re-verify on-chain on **every** path before fulfillment.
- Bound pollers and TTLs; expire stale orders.
- Log the `signature` and `reference` for every fulfilled order (audit trail).
- Keep RPC keys and any sponsor keys server-side; never ship them to the client.

## Checklist

- [ ] explicit order state machine with guarded transitions
- [ ] webhooks **and** polling, both re-verifying on-chain
- [ ] atomic, idempotent `paid → fulfilled`
- [ ] TTL + expiry for unpaid orders
- [ ] reconciliation job with mismatch surfacing
- [ ] webhook authentication
