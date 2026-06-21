# Transfer Requests (Non-Interactive)

A **transfer request** is a `solana:` URL that fully describes a SOL or SPL-token transfer.
The wallet composes and signs the transaction directly from the URL — **no server round
trip**. Best for fixed-price checkouts, tips, donations, and printed/displayed QR codes.

## The URL Scheme

```
solana:<recipient>
  ?amount=<amount>
  &spl-token=<mint>
  &reference=<reference>
  &label=<label>
  &message=<message>
  &memo=<memo>
```

- `recipient` (required, path): base58 address of a **native SOL account** — never an ATA.
  For SPL transfers the wallet derives the recipient's associated token account from `spl-token`.
- `amount` (optional): non-negative decimal in **UI units** (e.g. `1.5`, not lamports). Omitted = wallet prompts.
- `spl-token` (optional): SPL mint. Omitted = native SOL transfer.
- `reference` (optional, repeatable): your order ID key(s). **Always set one** — see [verification.md](verification.md).
- `label` / `message` (optional): human-readable source and purpose, shown by the wallet.
- `memo` (optional): on-chain SPL memo.

## Building a URL

The URL builder is **`encodeURL`** — `@solana/pay`'s only URL-construction export. It's
kit-native: addresses are plain base58 strings (or kit's `Address` type), amounts are plain
`number`.

```ts
import { encodeURL, createQR } from '@solana/pay';
import { address, generateKeyPairSigner } from '@solana/kit';

const recipient = address(MERCHANT_WALLET);          // base58 string is fine directly
const referenceSigner = await generateKeyPairSigner(); // fresh, unique per order
const reference = referenceSigner.address;
const USDC = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

const url = encodeURL({
  recipient,
  amount: 4.20,            // plain number — 4.20 USDC (UI units), not BigNumber
  splToken: USDC,
  reference,
  label: 'Café da Esquina',
  message: 'Pedido #1042 — Cappuccino',
});

// Persist BEFORE showing the URL/QR, so verification can find it later.
await db.orders.create({ id, reference, amount: 4.20, splToken: USDC, status: 'pending' });
```

`encodeURL` accepts either `TransferRequestURLFields` (as above) or
`TransactionRequestURLFields` (`{ link, label?, message? }`) for the interactive flow — see
[transaction-requests.md](transaction-requests.md).

## Rendering the QR Code

```ts
import { createQR } from '@solana/pay';

const qr = createQR(url, 360, 'transparent');
qr.append(document.getElementById('qr-container')!);
```

`createQR` accepts a `URL` or a plain string, in any framework. For React / server-rendered
pages where the DOM-append pattern is awkward, see [frontend.md](frontend.md).

## Open-Amount Requests (Tips, "Pay What You Want")

Omit `amount`. The wallet prompts the user. Because the paid amount is unknown up front,
you **cannot** validate an exact amount — decide your policy:
- Tips/donations: accept any amount ≥ 0; record whatever arrives.
- "Pay at least X": you must read the actual transferred amount from the confirmed tx and
  compare against your minimum, rather than relying on `validateTransfer`'s exact-amount check.

## Parsing an Incoming URL (Wallet / Client Side)

`parseURL` returns a discriminated union — `TransactionRequestURL | TransferRequestURL` —
not a single flat shape. Narrow it before destructuring (the type-checker will reject
direct field access otherwise):

```ts
import { parseURL } from '@solana/pay';

const parsed = parseURL(url);
if ('recipient' in parsed) {
  // TransferRequestURL — fixed-or-open-amount, fully self-contained
  const { recipient, amount, splToken, reference, label, message, memo } = parsed;
  // ...
} else {
  // TransactionRequestURL — server endpoint the wallet will POST to
  const { link, label, message } = parsed;
  // ...
}
```

## When NOT to Use Transfer Requests

Switch to [transaction-requests.md](transaction-requests.md) when:
- the price depends on server state (coupons, dynamic FX, inventory),
- you need to add instructions (fee split, loyalty points, memo program, a CPI to your program),
- you want to sponsor fees / abstract gas ([gasless.md](gasless.md)),
- you need server-side approval before the user signs.

## Checklist

- [ ] `recipient` is a native account, not an ATA
- [ ] unique `reference` generated via `generateKeyPairSigner()` and persisted **before** display
- [ ] `amount` is a plain `number` in UI units (not lamports, not `BigNumber`)
- [ ] correct `splToken` mint + verified decimals ([stablecoins.md](stablecoins.md))
- [ ] `label`/`message` set for wallet display trust
- [ ] verification path wired up ([verification.md](verification.md))
