---
description: "Quick commit with automatic formatting and conventional commit message"
---

You are creating a quick commit: format, generate a conventional message, commit.

## Steps
1. If on `main`/`master`, offer to create a feature branch `feat/<scope>-<desc>-DD-MM-YYYY`.
2. Stage changes (`git add -A` if nothing staged).
3. Format: `npx prettier --write` for TS/JS; `cargo fmt` for Rust; re-stage.
4. Determine type (`feat`/`fix`/`refactor`/`test`/`docs`/`chore`) and scope from the diff.
5. Show summary; commit with the conventional message.

For payment code specifically, prefer scopes like `pay`, `verify`, `merchant`, `ramp`.
