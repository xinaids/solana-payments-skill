# Payment Verification

> The single most important file in this skill. Every dollar lost to a botched Solana Pay
> integration is lost here. Treat the wallet and the client as fully untrusted.
>
> **Stack note**: `@solana/pay` (v1.0+) is built natively on `@solana/kit` — it takes a kit
> `Rpc` client, not a `@solana/web3.js` `Connection`. All examples below are kit-native. If
> your codebase still uses web3.js elsewhere, see [kit-interop.md](kit-interop.md) for the
> bridge.

## The Core Rule

**A payment is not "done" because the user's wallet said so.** Release goods, grant access,
or fulfill an order *only* after you have independently confirmed on-chain, from your own
server, that a transaction matching the order exists and is confirmed.

The spec is explicit: applications should ensure a transaction has been confirmed and is
valid before they release goods or services.

## The `reference` Is Your Order ID

A Solana Pay `reference` is an address included as a **read-only, non-signer** account key
on the transfer instruction. Validators index transactions by account key, so you can look
up a payment *before you ever know its signature* via `getSignaturesForAddress`.

Rules:
- Generate a **fresh, unique** reference per order.
- Persist the `reference ⇄ orderId` mapping the moment you create the payment URL.
- Never reuse a reference. Reuse = you cannot distinguish two payments.

```ts
import { generateKeyPairSigner } from '@solana/kit';

// At order creation — you only need the address, not a usable signer.
const referenceSigner = await generateKeyPairSigner();
const reference = referenceSigner.address; // Address (branded string)

await db.orders.update(orderId, { reference, status: 'pending' });
```

> `generateKeyPairSigner` is async (it generates a real Ed25519 keypair under the hood) and
> returns a `KeyPairSigner` whose `.address` is what you actually need here — you're using it
> as an inert marker key, not signing anything with it.

## The Verification Path

Two steps, both required. `findReference` locates the tx; `validateTransfer` proves it is
the *right* tx.

```ts
import { createSolanaRpc, address } from '@solana/kit';
import {
  findReference,
  validateTransfer,
  FindReferenceError,
  ValidateTransferError,
} from '@solana/pay';

const rpc = createSolanaRpc(process.env.RPC_URL!);

async function verifyOrder(
  order: Order,
): Promise<{ status: 'paid'; signature: string } | { status: 'pending' }> {
  const reference = address(order.reference);

  // 1. Find the transaction by reference. Throws FindReferenceError if none yet.
  let signatureInfo;
  try {
    signatureInfo = await findReference(rpc, reference, { commitment: 'confirmed' });
  } catch (err) {
    if (err instanceof FindReferenceError) return { status: 'pending' }; // not paid yet
    throw err;
  }

  // 2. Validate the transaction actually matches the order.
  try {
    await validateTransfer(
      rpc,
      signatureInfo.signature,
      {
        recipient: address(order.recipient),
        amount: Number(order.amount), // Amount is a plain `number` in @solana/pay
        splToken: order.splToken ? address(order.splToken) : undefined,
        reference,
      },
      { commitment: 'confirmed' },
    );
  } catch (err) {
    if (err instanceof ValidateTransferError) {
      // A tx exists but does NOT match (wrong amount, wrong recipient, wrong token).
      // This is an attack signal or a misconfigured client. Do NOT fulfill.
      await flagSuspicious(order.id, err.message);
      return { status: 'pending' };
    }
    throw err;
  }

  return { status: 'paid', signature: signatureInfo.signature };
}
```

`validateTransfer` checks, against the on-chain transaction:
- the **recipient** received the funds,
- the **amount** matches (so underpayment fails),
- the **splToken** matches (so paying in a worthless token fails),
- the **reference** is present.

Do not hand-roll these checks. Subtle bugs here are how underpayment and wrong-token
attacks succeed.

> `verifyOrder` returns the **signature** alongside `'paid'` — fulfillment needs it for the
> audit trail (see [merchant-server.md](merchant-server.md)). Don't drop it on the floor.

## Idempotent Fulfillment (Exactly Once)

You will usually run **both** a poller and a webhook. They *will* both fire for the same
payment. Fulfillment must happen exactly once.

```ts
// Atomic state transition: only the first caller wins.
async function markPaidAndFulfill(orderId: string, signature: string) {
  const updated = await db.orders.updateWhere(
    { id: orderId, status: 'pending' },        // guard: only if still pending
    { status: 'paid', signature, paidAt: new Date() },
  );
  if (updated.rowCount === 0) return; // someone already fulfilled — no-op

  await fulfill(orderId); // ship, grant access, etc.
}
```

If your store can't do a conditional update, use a unique constraint on
`(orderId, status='paid')` or an idempotency key on the fulfillment side. The point: the
*database* enforces single fulfillment, not your application flow.

## Finality: Confirmed vs Finalized

| Commitment | Latency | Reorg risk | Use for |
|------------|---------|-----------|---------|
| `confirmed` | ~1–2 s | Very low, non-zero | Coffee, tips, low-value digital goods |
| `finalized` | ~13 s | Effectively zero | High-value, irreversible fulfillment, cash-out |

Choose by value at risk. A $2 paywall on `confirmed` is fine. A $5,000 transfer that
triggers an irreversible fiat off-ramp should wait for `finalized`. State your choice
explicitly in code; don't leave it implicit. Both `findReference` and `validateTransfer`
take this as the `commitment` option — not `finality`.

## Attacks This Path Defends Against

| Attack | Defense |
|--------|---------|
| Client lies "payment succeeded" | Server re-verifies on-chain; never trusts client |
| Underpayment | `validateTransfer` amount check |
| Pay in a worthless SPL token | `validateTransfer` splToken check |
| Pay a different recipient | `validateTransfer` recipient check |
| Replay one payment across two orders | Unique reference per order; `reference ⇄ orderId` map |
| Double-fulfillment (poll + webhook) | Atomic conditional state transition |
| Reorg reverses a "confirmed" payment | Use `finalized` for high value |
| Token-2022 transfer fee underpays net amount | Account for fee config — see [stablecoins.md](stablecoins.md) |

## Pitfalls

- **Don't** poll `findReference` in a tight loop forever — bound it (e.g. 10-minute TTL),
  then mark the order expired. Unbounded polling leaks resources and hides UX failure.
- **Don't** verify on the client and skip the server check "to save a round trip."
- **Don't** assume `amount` is in lamports — Solana Pay amounts are in **UI units**
  (decimal token units), and `validateTransfer`'s `Amount` type is a plain `number`, not a
  `BigNumber` — don't wrap it in one.
- **Don't** pass a `@solana/web3.js` `Connection` to `findReference`/`validateTransfer` — they
  take a kit `Rpc` client from `createSolanaRpc()`.
- **Don't** reuse a single recipient ATA without references and try to match by amount —
  two orders for the same price become indistinguishable. References exist for this reason.

## Real-Time Alternative: `watchReference`

If 1–2 s polling latency is too slow, `@solana/pay` also exports `watchReference` — a
WebSocket-subscription version of `findReference` that resolves the moment a matching
transaction lands, instead of waiting for the next poll tick:

```ts
import { createSolanaRpcSubscriptions, address } from '@solana/kit';
import { watchReference, FindReferenceError } from '@solana/pay';

const rpcSubscriptions = createSolanaRpcSubscriptions(process.env.RPC_WS_URL!); // wss:// URL

async function watchForPayment(reference: string) {
  const controller = new AbortController();
  try {
    return await watchReference(rpcSubscriptions, address(reference), {
      commitment: 'confirmed',
      abortSignal: controller.signal,
    });
  } catch (err) {
    if (err instanceof FindReferenceError) return null; // aborted before a match
    throw err;
  }
}
```

Still **always** run `validateTransfer` on the returned signature before fulfilling — a
matched reference is not yet a *validated* payment ([the verification path](#the-verification-path)
above). Use `watchReference` to *detect* faster; keep `findReference`+polling as the
TTL-bounded backstop in case the WebSocket connection drops (see
[merchant-server.md](merchant-server.md)).

## Test This Path First

Your test suite should include the negative cases, not just the happy path:
- underpayment (amount too low) → not fulfilled
- wrong token → not fulfilled
- replayed reference → fulfilled at most once
- poller + webhook firing together → fulfilled exactly once

See [/test-payments](../commands/test-payments.md).
