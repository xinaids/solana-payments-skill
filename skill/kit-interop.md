# Solana Pay ↔ @solana/kit Interop

**Correction worth stating plainly: `@solana/pay` (v1.0+) is built natively on
`@solana/kit`.** Its `peerDependencies` are entirely `@solana/kit` and `@solana-program/*`
packages — there is no `@solana/web3.js` anywhere in its dependency tree. `findReference` and
`validateTransfer` take a kit `Rpc<...>` client, not a web3.js `Connection`. Addresses
(`Recipient`, `SPLToken`, `Reference`) are kit's branded `Address` string type, not
`PublicKey` objects.

This means: **if you're integrating Solana Pay into a fresh `@solana/kit` app, there is no
boundary to manage.** Use it directly — `import { ... } from '@solana/pay'` alongside
`import { ... } from '@solana/kit'`, no wrapper needed.

## The Real Interop Concern (the Reverse Direction)

The actual friction shows up when your **surrounding codebase** still uses
`@solana/web3.js` — an older Anchor client, an existing indexer, a library that hasn't
migrated. In that case, *that* code is what needs to bridge into Solana Pay's kit-native
world, not the other way around.

| Concept | `@solana/web3.js` (legacy) | `@solana/kit` / `@solana/pay` |
|---------|----------------------------|-------------------------------|
| Address | `PublicKey` | `Address` (branded string) |
| Bridge | `pubkey.toBase58()` → `string` | `address(str)` from `@solana/kit` |
| RPC client | `new Connection(url)` | `createSolanaRpc(url)` from `@solana/kit` |
| Amount (Solana Pay) | n/a | `number` (UI units) — not `BigNumber` |
| Keypair | `Keypair.generate()` (sync) | `await generateKeyPairSigner()` (async) |

```ts
// Bridging FROM legacy web3.js code INTO Solana Pay.
import { PublicKey } from '@solana/web3.js';      // existing legacy code
import { createSolanaRpc, address } from '@solana/kit';
import { findReference } from '@solana/pay';

function legacyPubkeyToKitAddress(pk: PublicKey) {
  return address(pk.toBase58()); // base58 string is the lingua franca
}

const rpc = createSolanaRpc(process.env.RPC_URL!);
const reference = address(order.reference); // already a string if you generated it via kit
await findReference(rpc, reference, { commitment: 'confirmed' });
```

The clean rule: **base58 strings are the lingua franca.** A `PublicKey.toBase58()` and a
kit `Address` are both just strings underneath — convert at the edges, don't carry
`PublicKey` objects into any `@solana/pay` call.

## What This Means for the Rest of This Skill

Every Solana Pay call in this skill ([verification.md](verification.md),
[transfer-requests.md](transfer-requests.md), [transaction-requests.md](transaction-requests.md))
is written kit-native: `createSolanaRpc`, `address()`, `generateKeyPairSigner()`. If your
project is `@solana/kit`-first already (the kit's default — see core `frontend-framework-kit.md`),
these examples drop in directly.

## If You're Still on web3.js Everywhere

You don't have to migrate your whole app to add Solana Pay — you only need the bridge above
at the call sites that touch `@solana/pay` or `@solana/kit`'s RPC. If you're considering a
fuller migration, the kit ships a dedicated command for it: `/migrate-web3` (see core
`kit-web3-interop.md` for the general Kit ↔ web3.js patterns beyond payments).

## Anti-Patterns

- ❌ Wrapping `@solana/pay` in a "boundary module" assuming it needs isolation from kit code —
  it doesn't; it *is* kit code.
- ❌ Passing a `Connection` or `PublicKey` to any `@solana/pay` function — both will fail
  TypeScript compilation (and a `Connection` has no overlapping shape with the expected
  `Rpc<...>` interface, so it also fails at runtime).
- ❌ Wrapping `Amount` values in `BigNumber` — `@solana/pay`'s `Amount` type is a plain
  `number`.
- ❌ Reimplementing `validateTransfer` "to stay pure" — re-deriving its checks is how
  verification bugs are born. Use the library; it's already kit-native.

## Checklist

- [ ] no `Connection`/`PublicKey` (web3.js) passed into any `@solana/pay` function
- [ ] RPC client created via `createSolanaRpc()`, addresses via `address()`
- [ ] amounts to `@solana/pay` are plain `number`, not `BigNumber`
- [ ] any legacy web3.js code in your app converts to base58 string at the boundary, not the
      other way around
