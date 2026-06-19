# Submission Kit — solana-payments-skill

Everything you need to (1) publish your repo, (2) open the PR to the kit, and (3) fill the
Superteam Earn questionnaire. Copy-paste blocks below.

---

## Path overview

The bounty accepts **either** "your own repo with a new skill" **or** a "PR link". For a *new*
skill, do both:
1. **Publish your own repo** → this is the primary, always-valid submission.
2. **Open a PR to the kit** adding it as an `ext/` submodule → boosts the **Fit** score and
   signals merge intent. The PR link is also a valid submission.

Submit the **repo link** as primary on Superteam Earn, and include the **PR link** too.

---

## Step 1 — Publish your own repo

```bash
cd solana-payments-skill        # the unzipped folder

git init
git add -A
git commit -m "feat: solana-payments skill for Solana AI Kit (accept/verify/settle/off-ramp)"
git branch -M main

# Option A — GitHub CLI
gh repo create xinaids/solana-payments-skill --public --source=. --remote=origin --push

# Option B — manual: create the empty repo on github.com first, then:
# git remote add origin https://github.com/xinaids/solana-payments-skill.git
# git push -u origin main
```

Before pushing, replace `<your-org>` in `README.md` install commands with `xinaids`.

Verify: `./validate.sh` passes, and the repo browses cleanly on GitHub.

---

## Step 2 — Open the PR to the kit (submodule)

A submodule must point at a **public** repo, so Step 1 must be done first.

```bash
# Fork + clone the kit
gh repo fork solanabr/solana-ai-kit --clone   # or fork on web, then git clone your fork
cd solana-ai-kit

git checkout -b feat/add-solana-payments-skill-$(date +%d-%m-%Y)

# Add your repo as a submodule at the exact path the kit uses for ext skills
git submodule add https://github.com/xinaids/solana-payments-skill.git \
  .claude/skills/ext/solana-payments
```

That auto-appends to `.gitmodules`. Confirm it matches the existing style:

```ini
[submodule ".claude/skills/ext/solana-payments"]
	path = .claude/skills/ext/solana-payments
	url = https://github.com/xinaids/solana-payments-skill.git
```

### Register it in the hub — `.claude/skills/SKILL.md`

The core skill only gestures at payments (one `payments.md` reference line for Commerce
Kit/Kora/Solana Pay). Add a routing entry so the agent reaches the full lifecycle skill.
Match the table style already in that file. Suggested row to add near the other ext skills:

```markdown
| Payments | [solana-payments/](ext/solana-payments/skill/SKILL.md) | Full payment lifecycle: Solana Pay transfer/transaction requests, server-side verification (findReference/validateTransfer, idempotency, replay, finality), stablecoins (USDC/USDG/PYUSD + Token-2022), gasless, merchant backend, fiat off-ramp incl. Pix |
```

And add a line to the task-routing section so payment intents route here, e.g.:

```markdown
| Accept / verify / settle a payment, checkout, QR, off-ramp/Pix | ext/solana-payments/skill/SKILL.md |
```

### Add the README submodule-table row — `README.md`

Match the existing "External Skill Submodules" table:

```markdown
| `ext/solana-payments`     | [xinaids/solana-payments-skill](https://github.com/xinaids/solana-payments-skill)             | Consumer/merchant payment lifecycle: Solana Pay, verification, stablecoins, gasless, fiat off-ramp (Pix)              |
```

### Commit + push + open PR

```bash
git add .gitmodules .claude/skills/ext/solana-payments .claude/skills/SKILL.md README.md
git commit -m "feat: add solana-payments skill (accept/verify/settle/off-ramp, incl. Pix)"
git push origin HEAD

gh pr create --repo solanabr/solana-ai-kit \
  --title "feat: add solana-payments skill (accept/verify/settle/off-ramp)" \
  --body-file PR_BODY.md     # paste the body below into PR_BODY.md first
```

> If `git submodule add` is awkward in your environment, an acceptable fallback is to copy the
> `skill/`, `agents/`, `commands/`, `rules/` content directly under `.claude/skills/ext/solana-payments/`
> in the PR. The submodule route is cleaner and matches how the kit curates ext skills, so prefer it.

---

## PR body (paste into PR_BODY.md)

```markdown
## What

Adds **solana-payments** — a skill covering the consumer/merchant payment lifecycle that the
kit currently lacks: **accept → verify → settle → off-ramp**.

The core `solana-dev` skill only references payments at a high level (`payments.md`:
Commerce Kit, Kora, Solana Pay). This skill is the depth behind that line.

## Why it's a gap

The kit covers DeFi protocol integrations (`sendai`) and in-game purchases (`solana-game`),
but nothing covers taking a real payment, proving on-chain it settled, handling the
stablecoin, and getting funds to a bank account. Every store / SaaS / creator tool needs this.

## What's inside

- **Accept**: Solana Pay transfer requests (URLs/QR) and transaction requests (server-composed)
- **Verify** (the highest-stakes file): `findReference` + `validateTransfer`, idempotent
  fulfillment, replay protection, confirmed-vs-finalized, race conditions
- **Settle**: USDC/USDG/PYUSD, decimals/mints resolved on-chain, Token-2022 transfer-fee and
  hook gotchas, gasless/sponsored transactions for users without SOL
- **Off-ramp**: Solana Developer Platform + ramp providers, **Pix (Brazil/LATAM)**, KYC/tax notes
- **Stack accuracy**: `@solana/pay` is kit-native (zero web3.js dependency, verified against the npm package)
- 3 agents, 4 commands, TS+Rust rules, installer, `validate.sh`

## Fit

Mirrors the `solana-game-skill` structure (addon to `solana-dev`, progressive SKILL.md
routing) for a clean merge. MIT licensed. No executables, no bloat — delegates programs,
swaps, and deep audits to existing kit skills.

## Notes

- Only the USDC mint is hardcoded (documented as the single safe-to-hardcode value); the skill
  instructs resolving every other mint + decimals on-chain.
- `validate.sh` guards against unexpected hardcoded addresses and broken links.
```

---

## Superteam Earn questionnaire answers

**What does it do / problem it solves**
> Adds the consumer/merchant payment lifecycle to the Solana AI Kit — accept (Solana Pay),
> verify on-chain, settle in stablecoins, and off-ramp to local fiat including Pix. The kit
> had DeFi and in-game purchases but no skill for taking a real payment and proving it
> settled. It makes the agent do the money-critical parts (verification, idempotency,
> Token-2022, finality, off-ramp) correctly by default.

**Why is it novel**
> Zero payment-lifecycle coverage existed in the kit; the core skill only references payments
> in one line. It also gets the real 2026 `@solana/pay` stack right (kit-native, zero web3.js dep, verified against the published npm package, not assumed)
> tension and treats the Brazil/LATAM Pix off-ramp as part of the architecture.

**Why is it production-grade**
> Verification-first design with negative-path tests (underpayment, replay, wrong mint,
> poll+webhook race); on-chain mint/decimals resolution (no assumed values); Token-2022
> transfer-fee handling; explicit finality choices; `validate.sh` integrity checks.

**How does it fit the kit**
> Same structure as `solana-game-skill` (addon to `solana-dev`, progressive SKILL.md
> routing, agents/commands/rules, installer). Added as an `ext/` submodule via PR. MIT.

**Links**
> Repo: https://github.com/xinaids/solana-payments-skill
> PR: <paste the kit PR link>

---

## Pre-submit checklist

- [ ] `README.md` `<your-org>` replaced with `xinaids`
- [ ] `./validate.sh` passes
- [ ] own repo public and pushed
- [ ] kit fork PR opened, submodule + README + hub routing edits included
- [ ] repo link (primary) + PR link submitted on Superteam Earn with questionnaire
- [ ] (optional, high-leverage) devnet proof project + screen recording attached
