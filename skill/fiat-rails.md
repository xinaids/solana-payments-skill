# Fiat Rails: On-Ramp, Off-Ramp & Pix

On-chain settlement solves half the problem. The other half is getting money **in** (fiat →
stablecoin) and **out** (stablecoin → local bank account). For Brazil and LATAM that last
mile is **Pix**, and it is the difference between a demo and a product people actually use.

## The Two Directions

- **On-ramp**: user pays in BRL (Pix), receives USDC/USDG on Solana.
- **Off-ramp**: user/merchant holds USDC/USDG on Solana, withdraws to BRL via Pix.

Pix settles **near-instant during business hours**, which makes Solana + stablecoin + Pix a
genuinely fast end-to-end rail — minutes, versus days for traditional cross-border fiat.

## Solana Developer Platform (SDP) — the official path

The Solana Foundation's **Solana Developer Platform**, launched in 2026, is an API-driven
infrastructure layer for stablecoin products. Two modules are live:

- **Issuance** — create and manage stablecoins / tokenized deposits / RWA tokens.
- **Payments** — orchestrate fiat and stablecoin flows: on-ramp, off-ramp, and on-chain
  transfers, across B2B / B2C / P2P (payroll, merchant settlement, recurring disbursements).

A **Trading** module (atomic swaps, vaults, on-chain FX) is scheduled for later in 2026.
SDP aggregates pre-integrated partners across node infra, wallets, compliance, and ramps, so
you integrate one modular interface instead of stitching vendors yourself. Early adopters
include Mastercard, Worldpay, and Western Union.

**When to use SDP**: enterprise / institutional builds that want a curated, pre-vetted stack
and don't want to run a long vendor evaluation. For a small app, a single ramp provider is
faster to ship.

## Ramp Providers (last-mile, incl. Pix)

For most app builders, integrate a ramp provider rather than building licensing/KYC yourself.
Providers below are named because each has confirmed Solana + Pix support as of mid-2026 —
verify current terms before integrating, since coverage and pricing shift:

| Provider | Shape | Pix / Solana confirmed |
|----------|-------|------------------------|
| **Ramp Network** | Hosted widget + API, 150+ countries | USDC/USDT/DAI across Solana + EVM chains; Pix (BR), SPEI (MX) named explicitly |
| **Transak** | Hosted widget + API, 160+ countries | USDC/USDT/DAI/PYUSD across Solana + EVM; PIX, UPI, SEPA Instant named explicitly |
| **Beam** | Consumer wallet w/ embedded off-ramp, US/LATAM-focused | USDC/USDT payout to PIX (BR), SPEI (MX), CBU (AR), ACH (US) |
| **Lightspark Grid** | B2B API, branded USD accounts, 65+ countries | Routes USD/stablecoin/Bitcoin to local instant rails incl. PIX (BR); supports USDC on Solana |
| **Bridge.xyz** (Stripe) | Full-stack issuance + off-ramp, enterprise | Particularly deep in LATAM — Mexico (SPEI) and Brazil (PIX) specifically called out |
| **Crossmint** | All-in-one wallet/onramp/offramp/compliance, 50+ chains | Solana confirmed at scale (MoneyGram, Western Union use it); Pix support not independently confirmed — ask before relying on it |

General shape to evaluate any provider against:

| Dimension | What to check |
|-----------|---------------|
| Local rail | Pix (BR), SPEI (MX), CBU (AR), SEPA (EU), UPI (IN), ACH/FedNow (US) |
| Settlement | Pix/SPEI near-instant; ACH/SEPA 1–3 days |
| Fees | ~1–2.5% + FX spread on stablecoin→local (varies by rail and KYC tier) |
| KYC model | Full-service (faster to ship) vs pass-through (you own UX) |
| Integration | Hosted widget (~30 min) vs full API (native UI, needs licensing) |
| Chains/tokens | Confirm USDC/USDG on **Solana** specifically, not just EVM |
| **Brazil-specific** | Is the provider itself a licensed SPSAV, or partnered with one? See regulatory note below — this is no longer optional. |

> Don't hardcode a single provider into the architecture. Put the ramp behind an interface
> so you can route by region (Pix provider for BR, another for EU) and fail over. Names and
> terms above were checked against multiple sources in mid-2026 — confirm current status
> before shipping; ramp coverage changes fast.

## Reference Off-Ramp Flow (Merchant → BRL)

```
merchant receives USDC/USDG on Solana (verified, finalized)
        │
        ▼
consolidate to treasury ATA  (optional: Jupiter swap to one token — delegate to sendai/jupiter)
        │
        ▼
ramp provider off-ramp API: quote → KYC'd payout to Pix key
        │
        ▼
BRL in bank account (near-instant)
```

For high-value off-ramps, wait for **`finalized`** before initiating the fiat leg — the
fiat payout is irreversible ([verification.md](verification.md)).

## Compliance & Tax (Brazil)

### BCB Resolutions 519, 520, 521 — read this before picking a Brazil off-ramp

Brazil's Central Bank (BCB) published Resolutions 519, 520, and 521 on November 10, 2025,
creating a formal regulatory category — **SPSAV** (Sociedade Prestadora de Serviços de
Ativos Virtuais) — for any company providing virtual-asset services, including stablecoin
on/off-ramps tied to Pix. This is now operative, not theoretical:

- **Resolution 520** (constitution/operation of SPSAVs) entered force **February 2, 2026**:
  mandatory BCB authorization to operate, mandatory **asset segregation** between client and
  company funds, and SPSAVs must be constituted and headquartered in Brazil.
- **Resolution 521** brings virtual-asset operations into the FX-market regulatory
  perimeter — a stablecoin off-ramp via Pix is now treated similarly to a foreign-exchange
  operation. Reporting obligations to the BCB start **May 4, 2026**.
- Any platform **already operating** in Brazil without a local SPSAV license must file for
  BCB authorization by **October 30, 2026** (270 days from Resolution 520's entry into
  force) or risk being cut off from Pix.

**What this means for your architecture**: a foreign ramp provider serving Brazilian users
needs either its own SPSAV authorization or a partnership with a licensed Brazilian SPSAV —
this is now a real compliance question to ask each provider, not a nice-to-have. Verify
current licensing status directly with the provider; this framework is mid-rollout and
provider compliance postures are still shifting through 2026.

### General compliance & tax

- **KYC/AML** is mandatory at the ramp boundary, now reinforced by the SPSAV framework above.
  Know which KYC tier (lite/standard/enhanced) and limits apply to your users.
- Stablecoin regulation tightened globally in 2026 (e.g. GENIUS Act in the US, MiCA in the
  EU, SPSAV in Brazil). Pick providers that treat compliance as built-in, not bolted-on.
- **Brazilian individual tax declaration**: crypto gains below the monthly BRL exemption
  threshold are exempt from tax, **but declaration is still required** — assets under *Bens
  e Direitos* (código 89) and exempt income under *Rendimentos Isentos* (grupo 05). This is
  general information, not tax advice; thresholds, forms, and reporting mechanics are
  actively changing under the 2026 framework above — confirm current requirements with a
  contador or current Receita Federal guidance, not this document.

## Cross-Chain Note

If you accept USDC on multiple chains and consolidate on Solana: Circle's **CCTP V1 is
deprecated, with phase-out beginning July 31, 2026**. Any cross-chain USDC integration still
on V1 needs to migrate to the current CCTP version before that date. Confirm the active
version at integration time — this is a hard deadline, not a soft recommendation.

## Decision Guide

| You are... | Use |
|-----------|-----|
| A small app, BR users, want to ship fast | One Pix-capable ramp provider, hosted widget |
| Regional, multi-rail | Provider-agnostic interface, route by region |
| Enterprise / institutional | Solana Developer Platform (Payments module) |
| Consolidating multi-token treasury | Swap via Jupiter (sendai skill) then off-ramp |

## Checklist

- [ ] confirmed provider supports USDC/USDG on **Solana** + **Pix** payout
- [ ] for Brazil specifically: provider is a licensed SPSAV or partners with one (BCB Res. 519/520/521)
- [ ] ramp behind a provider-agnostic interface (region routing / failover)
- [ ] `finalized` before irreversible fiat payout
- [ ] KYC tier and limits understood for target users
- [ ] tax/declaration guidance surfaced to the user (not assumed away)
- [ ] if bridging cross-chain USDC, confirmed on current CCTP version (V1 deprecated, phase-out from Jul 31, 2026)
