# Rust / Anchor Rules — Payment Programs

Auto-loaded for `.rs` in payment programs. Extends core Rust/Anchor rules. For most payment
apps you do NOT need a program — prefer Solana Pay transfer/transaction requests. Use a
program only for escrow, splits, subscriptions (delegated pull), or conditional release.

## When a program is justified
- Escrow / conditional release, atomic multi-party splits, on-chain subscription pulls.
- Otherwise, delegate to off-chain Solana Pay flows.

## Safety (delegate deep audits to solana-dev security + trailofbits)
- Validate every account: owner, signer, and that token accounts match the expected mint.
- Use `transfer_checked` (with decimals) for SPL transfers in CPI.
- Guard against arithmetic overflow (checked math) on amounts.
- For Token-2022: account for transfer-fee extensions; resolve transfer-hook extra accounts.
- Never assume an ATA exists; create or require it explicitly.
- Reuse the SVS-style snapshot pattern: extract owned data from `remaining_accounts` before CPI loops to avoid lifetime conflicts; use explicit `'info` lifetimes on handlers mixing `remaining_accounts` with `ctx.accounts.*`.

## Testing
- LiteSVM/Mollusk for units; Surfpool/devnet for integration. Test underpayment, wrong mint, replay.
