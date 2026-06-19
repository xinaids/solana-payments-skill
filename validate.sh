#!/bin/bash
# Validate skill integrity: frontmatter, internal links, installer syntax.
# Run from repo root:  ./validate.sh
set -u
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
fail=0

echo "==> Frontmatter (skill/SKILL.md, agents/, commands/)"
for f in skill/SKILL.md agents/*.md commands/*.md; do
    if head -1 "$f" | grep -q '^---$'; then
        echo -e "  ${GREEN}OK${NC}  $f"
    else
        echo -e "  ${RED}MISSING FRONTMATTER${NC}  $f"; fail=1
    fi
done

echo "==> Internal skill links resolve"
cd skill
for target in $(grep -oh '](\([a-z0-9-]*\.md\))' *.md | sed 's/](\(.*\))/\1/' | sort -u); do
    if [ -f "$target" ]; then echo -e "  ${GREEN}OK${NC}  $target";
    else echo -e "  ${RED}BROKEN LINK${NC}  $target"; fail=1; fi
done
cd "$SCRIPT_DIR"

echo "==> Installer bash syntax"
for s in install.sh install-custom.sh; do
    if bash -n "$s" 2>/dev/null; then echo -e "  ${GREEN}OK${NC}  $s";
    else echo -e "  ${RED}SYNTAX ERROR${NC}  $s"; fail=1; fi
done

echo "==> Hardcoded base58 addresses (only cross-verified stablecoin mints allowed)"
hits=$(grep -rno '[1-9A-HJ-NP-Za-km-z]\{32,44\}' skill/ rules/ \
    | grep -v -E 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v|2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH|2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo' || true)
if [ -z "$hits" ]; then echo -e "  ${GREEN}OK${NC}  no unexpected hardcoded addresses";
else echo -e "  ${YELLOW}REVIEW${NC} unexpected base58 literal(s):"; echo "$hits" | sed 's/^/    /'; fi

echo "==> @solana/pay API accuracy regression guard"
# These specific strings were confirmed wrong against the real @solana/pay@1.0.20 tarball
# (verified via npm pack, not assumed). If they reappear, a future edit reintroduced them.
declare -a bad_patterns=(
    "createTransferRequestURL"
    "finality: 'confirmed'"
    "lastValidBlockHeight: 0"
)
api_fail=0
for pat in "${bad_patterns[@]}"; do
    hit=$(grep -rn "$pat" skill/ CLAUDE.md README.md 2>/dev/null || true)
    if [ -z "$hit" ]; then
        echo -e "  ${GREEN}OK${NC}  no occurrences of: $pat"
    else
        echo -e "  ${RED}REGRESSION${NC}  found banned pattern '$pat':"
        echo "$hit" | sed 's/^/    /'
        api_fail=1
    fi
done
[ "$api_fail" -eq 1 ] && fail=1

echo ""
if [ "$fail" -eq 0 ]; then echo -e "${GREEN}All checks passed.${NC}"; else echo -e "${RED}Some checks failed.${NC}"; exit 1; fi
