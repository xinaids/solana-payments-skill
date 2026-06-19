# Stablecoins for Payments

Payment apps settle in stablecoins, not SOL. This file covers picking one, handling mints
and decimals correctly, and the Token-2022 traps that silently break naive verification.

## Verify, Don't Trust, Mints

Hardcoding a wrong mint sends money to the void. Even for the addresses below — verified
against multiple independent sources at time of writing — **still confirm on-chain**
(`getMint`/`fetchMint`) before trusting decimals, and re-check the mint itself if you're
reading this much later than 2026; reissuance and multi-chain expansions happen.

| Token | Network status (2026) | Mint (Solana) | Confidence | Notes |
|-------|------------------------|----------------|------------|-------|
| **USDC** | Native Circle issuance | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | High — canonical, long-standing | Deepest liquidity. Classic SPL Token. |
| **USDG** | Live on Solana (Global Dollar Network, Paxos / MAS-regulated) | `2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH` | High — cross-checked across 5 independent sources (Phantom, Solflare, OKX, Solscan, LBank), live data | Reward-sharing network. Classic SPL Token. |
| **PYUSD** | Available on Solana (PayPal/Paxos) | `2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo` | Medium — single primary developer source (QuickNode integration docs); confirm before relying on it | **Token-2022**: permanent delegate, transfer-fee extension initialized (currently 0%), confidential transfers, transfer hooks. **Do not** assume classic SPL behavior. |

> Rule: don't invent a mint address from memory. The three above were checked against
> multiple sources before being written down — but "checked once, written down" is still
> weaker than "verified on-chain at runtime." Always call `getMint`/`fetchMint` before
> computing amounts; treat this table as a starting point, not a substitute.

```ts
import { getMint } from '@solana/spl-token';

// Always read decimals from chain; never assume.
const mintInfo = await getMint(connection, mintPubkey);
const decimals = mintInfo.decimals;
const baseUnits = BigInt(Math.round(uiAmount * 10 ** decimals));
```

Kit-native equivalent (`@solana-program/token`, no `@solana/web3.js` needed):

```ts
import { fetchMint } from '@solana-program/token';
import { createSolanaRpc, address } from '@solana/kit';

const rpc = createSolanaRpc(process.env.RPC_URL!);
const mintAccount = await fetchMint(rpc, address(mintAddress));
const decimals = mintAccount.data.decimals;
const baseUnits = BigInt(Math.round(uiAmount * 10 ** decimals));
```

## Decimals: The Off-By-10^6 Bug

Solana Pay URLs use **UI units** (`4.20`). On-chain instructions use **base units**
(`4_200_000` for 6-decimal USDC). Mixing them is the most common payment bug.

- URL/`encodeURL`/`validateTransfer` (`@solana/pay`'s `Amount` type): UI units as a plain `number`.
- `createTransferCheckedInstruction` / `getTransferCheckedInstruction`: base units (`bigint`) **plus** the decimals argument.
- Prefer the "checked" variant over plain `transfer` — it validates decimals and fails loudly on mismatch.

## Associated Token Accounts (ATAs)

- The Solana Pay `recipient` is the merchant's **wallet** (native account), not its ATA.
- For SPL transfers, the recipient ATA is **derived** from `recipient` + `mint`.
- If the merchant's ATA does not exist yet, the **first** payment must create it
  (`createAssociatedTokenAccountInstruction`). With transfer requests the wallet handles
  this; with transaction requests you may need to add the create-ATA instruction yourself.
- Decide who pays ATA rent. For a sponsored flow, the merchant/sponsor should pre-create its
  own ATA so customers never pay for it.

## Token-2022: Where Naive Verification Breaks

Some stablecoins (e.g. PYUSD) and many new tokens use **Token-2022**, not the classic SPL
Token program. Two extensions directly affect payments:

### Transfer Fee
A transfer-fee config skims a fee on every transfer, so the **net amount received is less
than the amount sent**. A naive "did I receive exactly X?" check fails on legitimate
payments.

- Use the program's fee config to compute the expected net, or
- Quote and verify the **net received** amount, not the gross sent amount.
- `validateTransfer` against a gross amount will reject fee-bearing tokens — handle these explicitly.

### Transfer Hook
A transfer-hook token runs a custom program on every transfer. The hook can add account
requirements or fail the transfer under conditions you don't control. For payments:
- Build transfers with the hook's extra accounts resolved (use the token-2022 helpers).
- Don't integrate a hooked token as a payment currency without reading its hook program.

### Other extensions to notice
- **Confidential transfers**: amounts are encrypted — you cannot read the amount the usual way.
- **Default account state / freeze**: accounts may be frozen; transfers can fail.
- **Permanent delegate**: a third party can move funds — a trust consideration for a treasury.

> Decision: for a payment currency, prefer a well-understood token (USDC classic SPL) unless
> you have a specific reason. If accepting a Token-2022 token, read its extension set first
> and adjust the verification math accordingly.

## Which Stablecoin Should I Accept?

| Priority | Pick |
|----------|------|
| Liquidity, broadest wallet support, simplest | USDC |
| Regulated issuer, reward-sharing network, institutional rails | USDG |
| PayPal ecosystem reach | PYUSD (Token-2022 — handle fees/hooks) |

You can accept several and normalize internally to a single accounting unit (e.g. always
book USD-cents), swapping via Jupiter if you need to consolidate treasury (delegate swap
logic to `sendai`/`jupiter` skills).

## Checklist

- [ ] mint resolved from a trusted source (only USDC hardcoded)
- [ ] decimals read on-chain, not assumed
- [ ] UI units vs base units kept straight; `transferChecked` used
- [ ] recipient ATA existence handled (who creates / who pays rent)
- [ ] Token-2022? transfer-fee math and hook accounts handled, or token rejected
