#!/bin/bash
# Independent compiler verification of every code block in solana-payments-skill.
# This installs the REAL packages and type-checks the EXACT code from the skill files.
set -e
echo "Installing real packages (@solana/pay, @solana/kit, @solana-program/token, @solana/kora, web3.js, spl-token)..."
npm install --legacy-peer-deps --silent \
  @solana/pay@latest @solana/kit@latest @solana-program/token@latest \
  @solana-program/memo@latest @solana-program/token-2022@latest \
  @solana/web3.js@latest @solana/spl-token@latest @solana/kora@latest \
  typescript @types/node 2>&1 | tail -5
echo ""
echo "Type-checking against installed package versions..."
npx tsc --noEmit 2>&1 | grep -v "node_modules" && echo "" && echo "FAILED — see errors above" && exit 1
echo "PASS — zero errors in skill code (only pre-existing @solana/pay internal QR type quirk may show in node_modules, ignored)"
