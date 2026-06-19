# Resources

Curated, current references for Solana payments. Verify versions and addresses at
integration time — this space moves fast.

## Solana Pay
- Solana Pay spec (transfer + transaction requests): https://docs.solanapay.com/spec
- Solana Pay overview: https://solana.com/docs/tools/solana-pay/overview
- `@solana/pay` library: https://github.com/solana-foundation/solana-pay
- Transfer request guide: https://docs.solanapay.com/core/transfer-request/merchant-integration
- Transaction request guide: https://docs.solanapay.com/core/transaction-request/merchant-integration

## Modern Stack
- `@solana/kit`: https://github.com/anza-xyz/kit
- web3.js ↔ kit interop: see [kit-interop.md](kit-interop.md) and core `kit-web3-interop.md`
- SPL Token / Token-2022: https://spl.solana.com/token-2022

## Stablecoins
- USDC (Circle) on Solana: https://www.circle.com/usdc
- USDG (Global Dollar Network / Paxos): https://globaldollar.com
- PYUSD (PayPal/Paxos) — Token-2022; resolve mint from official source
- Always verify mint + decimals on-chain before use ([stablecoins.md](stablecoins.md))

## Fiat Rails
- Solana Developer Platform (SDP): https://solana.com/solutions/sdp
- SDP launch context: https://solana.com/news/solana-developer-platform
- Circle CCTP (cross-chain USDC) — V1 deprecated, phase-out begins July 31, 2026; confirm
  current version at integration time
- Ramp providers verified for Solana + Pix (mid-2026): Ramp Network, Transak, Beam,
  Lightspark Grid, Bridge.xyz — evaluate per region; do not hardcode one — keep behind a
  provider-agnostic interface
- Brazil BCB Resolutions 519/520/521 (SPSAV framework, Nov 10 2025 / force Feb 2 2026):
  any Brazil-facing ramp must be a licensed SPSAV or partner with one — verify with the
  provider directly, this is mid-rollout through 2026

## Infra (delegate to kit skills)
- Helius (RPC, webhooks, DAS): via the kit's `helius` skill
- Jupiter (treasury swaps/consolidation): via the kit's `jupiter` / `sendai` skills
- Gasless / paymaster: Kora (open-source relayer) — see [gasless.md](gasless.md)

## Security
- Program + client security checklist: core `security.md`
- Trail of Bits / Ghost Security skills in the kit for deeper audit passes

## This Skill
- Verification is the highest-stakes file: [verification.md](verification.md)
- Brazil/LATAM off-ramp differentiator: [fiat-rails.md](fiat-rails.md)
