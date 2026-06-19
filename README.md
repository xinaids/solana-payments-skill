# Solana Payments Skill for Claude Code

A Claude Code skill addon for **production Solana payments**: accept payments, prove they
settled, handle stablecoins, and bridge to local fiat — including **Pix** for Brazil/LATAM.

> **Extends**: [solana-dev-skill](https://github.com/solana-foundation/solana-dev-skill)
> Built to slot into the [Solana AI Kit](https://github.com/solanabr/solana-ai-kit).

## The Problem It Solves

The Solana AI Kit covers DeFi protocol integrations and in-game purchases, but nothing
covers the **consumer/merchant payment lifecycle** — the thing every store, SaaS, creator
tool, and fintech actually needs:

> Take a real payment → **prove on-chain it happened** → settle in a stablecoin → get it to a
> bank account.

Most Solana Pay integrations get the easy part (generate a QR) and fumble the part that loses
money (verification, idempotency, Token-2022 fee skim, finality, off-ramp). This skill makes
the agent do the hard part correctly by default.

```
┌──────────────────────────────────────────────────────────────────┐
│                  solana-payments-skill (addon)                    │
│                                                                   │
│   accept ──▶ verify ──▶ settle ──▶ off-ramp                       │
│     │          │           │          │                           │
│  transfer/  findReference Token-2022  SDP / ramp providers        │
│  transaction validateTransfer USDC/   Pix (BR), SPEI, SEPA…       │
│  requests   idempotency   USDG/PYUSD                              │
│                              │                                    │
│                              ▼ delegates to                       │
│   solana-dev-skill (programs, wallet, core security, testing)     │
└──────────────────────────────────────────────────────────────────┘
```

## What's Included

### Skill files (progressive, token-efficient loading)

| File | What it covers |
|------|----------------|
| `skill/SKILL.md` | Entry point — routing hub |
| `skill/transfer-requests.md` | Non-interactive `solana:` URLs, QR codes, open-amount |
| `skill/transaction-requests.md` | Server-composed dynamic transactions (GET/POST) |
| `skill/verification.md` | **The crown jewel** — `findReference`/`validateTransfer`, idempotency, replay, finality |
| `skill/stablecoins.md` | USDC/USDG/PYUSD, mints, decimals, Token-2022 gotchas |
| `skill/gasless.md` | Sponsored/fee-abstracted tx for users without SOL |
| `skill/merchant-server.md` | Order state machine, webhooks, reconciliation |
| `skill/fiat-rails.md` | On/off-ramp, **Pix (Brazil)**, SDP, provider comparison, KYC/tax |
| `skill/frontend.md` | Checkout UX, QR rendering, polling, mobile deep links |
| `skill/kit-interop.md` | Bridging legacy web3.js code into kit-native `@solana/pay` |
| `skill/resources.md` | Curated current links |

### Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| `payments-architect` | opus | Payment system design, rail/stablecoin selection, threat model |
| `payments-engineer` | opus | Implement flows, verification, server, frontend, gasless |
| `merchant-integration-engineer` | sonnet | Ramps, KYC/compliance, webhooks, reconciliation |

### Commands

| Command | Purpose |
|---------|---------|
| `/scaffold-checkout` | Checkout (link or QR) **with** the verification endpoint wired in |
| `/verify-payment` | Build or audit the server-side verification path |
| `/test-payments` | Run flow tests incl. negative cases (underpay, replay, wrong mint, race) |
| `/quick-commit` | Conventional commit with formatting |

### Rules

Path-scoped code rules for payment TypeScript (`rules/typescript.md`) and payment
Rust/Anchor programs (`rules/rust.md`), auto-loaded by file type.

## Why It's Different (and Safe)

- **Verification-first.** The skill designs the "did they actually pay?" path before the
  happy path — the opposite of most tutorials.
- **Current to the 2026 stack.** `@solana/pay` v1.0+ is kit-native (no web3.js dependency) —
  this skill gets that right and bridges legacy web3.js code correctly, plus Token-2022
  transfer fees, the Solana Developer Platform, and current off-ramp rails.
- **Regional last mile.** Pix/BRL off-ramp is treated as part of the architecture, not an
  afterthought — with tax-declaration guidance surfaced, not hidden.
- **No shady executables, no bloat.** Pure markdown skills + small shell installer. Delegates
  to existing kit skills (programs, swaps, deep audits) instead of duplicating them.

## Installation

### Custom install (recommended)

```bash
git clone https://github.com/<your-org>/solana-payments-skill
cd solana-payments-skill
./install-custom.sh
```

Lets you choose personal (`~/.claude/skills/`) vs project (`./.claude/skills/`) install,
skip the core skill if you already have `solana-dev-skill`, and choose where `CLAUDE.md` goes.

### Standard install

```bash
./install.sh        # interactive, sensible defaults
./install.sh -y     # non-interactive
```

Installs `solana-dev-skill` (core dependency) + `solana-payments` into `~/.claude/skills/`.

### Slotting into the Solana AI Kit

Drop this repo's `skill/` content under the kit's `.claude/skills/` (or add it as a
submodule alongside the other `ext/` skills) and the kit's `SKILL.md` hub can route payment
tasks here. The structure intentionally mirrors `solana-game-skill` for a clean merge.

## Usage Examples

```
"Add a Solana Pay checkout to my Next.js store, USDC, with verification"
"How do I know a Solana Pay payment actually went through?"
"My users only have USDC, no SOL — make payments gasless"
"Accept USDG and off-ramp to BRL via Pix"
"Audit my payment verification for double-fulfillment and underpayment bugs"
"Use Solana Pay in my @solana/kit app, and bridge my legacy web3.js code into it"
```

## Contributing

1. Fork the repo
2. `git checkout -b feat/my-feature-$(date +%d-%m-%Y)`
3. Keep skill files focused and progressively loadable; verify any address/version before adding
4. Submit a PR

## License

MIT — see [LICENSE](LICENSE).

---

Built for the Superteam Brasil "Ship useful agent skills for Solana AI Kit" bounty.
