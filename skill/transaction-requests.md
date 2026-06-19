# Transaction Requests (Interactive)

A **transaction request** points the wallet at *your server* instead of encoding a transfer
in the URL. The wallet does a `GET` (to fetch label/icon) and a `POST` (to fetch a fully
composed transaction). Use this whenever the transaction must be built with server-side
logic: dynamic pricing, coupons, fee splits, loyalty rewards, sponsored fees, or a CPI into
your own program.

## The URL

```
solana:https://yourserver.com/api/pay/<orderId>
```

The path is an `https://` link your server controls. The wallet hits it in two phases.

## Phase 1 — GET (label + icon)

The wallet shows the user *who* is requesting before anything else.

```ts
// GET /api/pay/[orderId]
export async function GET() {
  return Response.json({
    label: 'Café da Esquina',
    icon: 'https://yourserver.com/icon.png', // SVG, PNG, or WebP, absolute URL
  });
}
```

## Phase 2 — POST (compose the transaction)

The wallet POSTs `{ account }` (the user's public key). You build, partially configure, and
return a **base64-encoded serialized transaction** plus an optional human `message`.

> This phase composes a raw transaction — it doesn't call into `@solana/pay` itself except
> to attach the `reference` key, so either `@solana/web3.js` or `@solana/kit` works here.
> The example below uses web3.js/`@solana/spl-token` for instruction composition, which is
> still a fully valid, compiling choice in a kit-first app — only the Solana Pay-specific
> calls (`findReference`, `validateTransfer`, `encodeURL`) require the kit-native types
> documented in [verification.md](verification.md) and [kit-interop.md](kit-interop.md).

```ts
// POST /api/pay/[orderId]  body: { account: string }
import {
  Connection, PublicKey, Transaction, clusterApiUrl,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress, createTransferCheckedInstruction, getMint,
} from '@solana/spl-token';

export async function POST(req: Request, { params }: { params: { orderId: string } }) {
  const { account } = await req.json();
  const payer = new PublicKey(account);

  const order = await db.orders.get(params.orderId); // server-trusted price/state + mint
  const connection = new Connection(process.env.RPC_URL ?? clusterApiUrl('mainnet-beta'), 'confirmed');

  const mint = new PublicKey(order.splToken);   // resolved per stablecoins.md, not hardcoded here
  const merchant = new PublicKey(order.recipient);

  // Read decimals on-chain — never assume (see stablecoins.md). Cache per-mint at startup
  // in production so you don't pay an RPC round-trip on every POST.
  const { decimals } = await getMint(connection, mint);

  const payerAta = await getAssociatedTokenAddress(mint, payer);
  const merchantAta = await getAssociatedTokenAddress(mint, merchant);

  // amount is a plain number in UI units (e.g. order.amount = 4.20); convert to base units
  // as a bigint using the on-chain decimals — no BigNumber needed for this multiplication.
  const baseUnits = BigInt(Math.round(order.amount * 10 ** decimals));

  const ix = createTransferCheckedInstruction(payerAta, mint, merchantAta, payer, baseUnits, decimals);
  // Attach the order reference as a read-only key so verification can find it.
  ix.keys.push({ pubkey: new PublicKey(order.reference), isSigner: false, isWritable: false });

  // Destructure the real lastValidBlockHeight — a hardcoded 0 makes every transaction
  // immediately expired and unsubmittable.
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
  const tx = new Transaction({ feePayer: payer, blockhash, lastValidBlockHeight });
  tx.add(ix);

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  return Response.json({
    transaction: serialized.toString('base64'),
    message: `Pedido #${order.number} — ${order.amount} USDC`,
  });
}
```

### Key points

- **The server is the source of truth for price.** Never accept an amount from the client.
- Always embed the order `reference` as a read-only key so the same
  [verification.md](verification.md) path works.
- Return the tx **unsigned** by the user (`requireAllSignatures: false`); the wallet signs.
- If you sponsor fees, set `feePayer` to your sponsor and partially sign server-side —
  see [gasless.md](gasless.md).
- `message` is shown to the user; keep it accurate (it builds trust and reduces disputes).

## Security for the POST Endpoint

A transaction request endpoint composes transactions for arbitrary callers. Harden it:

- **Validate `account`** is a real base58 pubkey before use.
- **Rate-limit** per order and per IP — it can be hammered.
- **Re-check order state** (`pending`, not expired, not already paid) on every POST.
- **Never** put secrets or signer keys in the returned transaction beyond an intended
  sponsor signature.
- **Pin the recipient and amount from server state**, never from query/body.
- Treat the endpoint as untrusted-input-facing: it is effectively a transaction factory.

## GET/POST Boundary Recap

| Phase | Wallet sends | You return |
|-------|--------------|-----------|
| GET | nothing | `{ label, icon }` |
| POST | `{ account }` | `{ transaction (base64), message? }` |

## When to Prefer Transfer Requests Instead

If the price is fixed and you don't need to compose anything, a
[transfer request](transfer-requests.md) is simpler, serverless, and printable as a static
QR. Don't reach for a server when a static URL does the job.
