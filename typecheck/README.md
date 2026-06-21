# Compiler-Verified Type Checks

Every code block from `skill/*.md` extracted verbatim and type-checked against the **real,
currently-published** `@solana/pay`, `@solana/kit`, `@solana-program/token`, `@solana/kora`,
`@solana/web3.js`, and `@solana/spl-token` packages — not manually read `.d.ts` files, the
actual TypeScript compiler.

## Run it yourself

```bash
cd typecheck
./run.sh
```

Installs the real packages and runs `tsc --noEmit`. A clean pass means every documented
API call in the skill compiles against current package versions — not just "looks right."

## Why this exists

Skill documentation can drift from reality: package APIs change, names get renamed, types
shift. This harness catches that automatically instead of relying on a human re-reading
`.d.ts` files. It already caught two real bugs before this commit:
- `parseURL` returns a discriminated union (`TransactionRequestURL | TransferRequestURL`) —
  destructuring without narrowing fails to compile.
- `@solana/kora`'s `signTransaction` expects `transaction` as a base64 **string**, not an
  object.

Re-run `./run.sh` after any edit to a code block in `skill/*.md` to catch drift early.
