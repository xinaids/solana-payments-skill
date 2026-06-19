# Checkout Frontend

The UI between "show a payment" and "confirm it landed." Covers QR rendering, the polling
loop, status UX, and mobile wallet deep links. For wallet connection itself, delegate to
[frontend-framework-kit.md](../solana-dev/frontend-framework-kit.md).

## The Checkout Lifecycle (Client Side)

```
create order (server) ──▶ show QR / button ──▶ poll status ──▶ success / expired
```

The client **never** decides "paid." It asks the server, which verifies on-chain
([verification.md](verification.md)).

## Rendering the QR

`@solana/pay`'s `createQR` is DOM-based. In React, render into a ref, or use a plain QR
library on the URL string.

```tsx
import { useEffect, useRef } from 'react';
import { createQR } from '@solana/pay';

export function PaymentQR({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const qr = createQR(url, 320, 'transparent');
    qr.append(ref.current);
  }, [url]);
  return <div ref={ref} aria-label="Solana Pay QR code" />;
}
```

Server-side rendering (Next.js): generate an SVG QR on the server from the `solana:` string
and stream it, avoiding the DOM dependency entirely.

## Polling the Status

```tsx
import { useEffect, useState } from 'react';

type Status = 'pending' | 'paid' | 'expired';

export function usePaymentStatus(orderId: string) {
  const [status, setStatus] = useState<Status>('pending');
  useEffect(() => {
    if (status !== 'pending') return;
    const id = setInterval(async () => {
      const r = await fetch(`/api/orders/${orderId}/status`);
      const { status: s } = await r.json();   // server's verified status
      if (s !== 'pending') { setStatus(s); clearInterval(id); }
    }, 1500);
    return () => clearInterval(id);
  }, [orderId, status]);
  return status;
}
```

Notes:
- Poll ~1–1.5 s; Solana `confirmed` lands in ~1–2 s.
- **Bound it.** Stop at the order TTL and show an "expired" state; don't poll forever.
- For lower latency you can drive status from a server-sent event/websocket fed by the
  webhook ([merchant-server.md](merchant-server.md)) — but always keep polling as a fallback.

## Status UX

| State | UX |
|-------|----|
| `pending` | QR + amount + token + "waiting for payment", live spinner |
| `paid` | clear success, order/receipt reference, what happens next |
| `expired` | "payment window closed", one-tap "generate new payment" |
| `flagged` | neutral "we couldn't confirm this payment, contact support" — don't accuse |

Always display the **amount, token, and merchant label** next to the QR so the user verifies
before scanning. This reduces wrong-amount and wrong-token mistakes.

## Mobile: Deep Links

On mobile the QR is often impractical (the wallet is on the same device). Use the `solana:`
URL as a tappable link / button so the OS hands it to the wallet app.

```tsx
<a href={solanaPayUrl} className="pay-button">Pay {amount} {tokenSymbol}</a>
```

- Register/handle the `solana:` scheme so wallets can intercept it.
- After returning from the wallet, resume polling — the user may approve and come back before
  the chain confirms.
- For deeper mobile wallet integration (Mobile Wallet Adapter, return links), see the
  `solana-mobile` skill in the kit.

## Accessibility & Trust

- Label the QR for screen readers; never rely on the image alone.
- Show the human-readable `message`/`label` you put in the request.
- Don't auto-advance to "success" on a client timer — only on a server-confirmed status.

## Checklist

- [ ] QR rendered from the `solana:` URL; SSR path uses an SVG, not the DOM helper
- [ ] polling bounded by TTL; expired state handled
- [ ] status comes from the **server's verified** status, never a client guess
- [ ] amount + token + merchant label shown beside the QR
- [ ] mobile uses a tappable deep link; polling resumes on return
