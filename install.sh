#!/bin/bash
# Solana Payments Skill - Standard Installer
# Installs with recommended defaults. For custom options, use ./install-custom.sh
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'
MAGENTA='\033[0;35m'; RED='\033[0;31m'; WHITE='\033[1;37m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/skill"
SKILLS_DIR="$HOME/.claude/skills"
PAY_SKILL_PATH="$SKILLS_DIR/solana-payments"
CORE_SKILL_PATH="$SKILLS_DIR/solana-dev"
CLAUDE_MD_PATH="$HOME/.claude/CLAUDE.md"

print_banner() {
    echo ""
    echo -e "${MAGENTA}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║${NC}   ${WHITE}Solana Payments Skill for Claude Code${NC}                ${MAGENTA}║${NC}"
    echo -e "${MAGENTA}║${NC}   ${CYAN}accept · verify · settle · off-ramp (Pix)${NC}            ${MAGENTA}║${NC}"
    echo -e "${MAGENTA}║${NC}   ${YELLOW}Powered by Superteam Brasil${NC}                          ${MAGENTA}║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

SKIP_CONFIRM=false
while [[ $# -gt 0 ]]; do
    case $1 in
        -y|--yes) SKIP_CONFIRM=true; shift ;;
        -h|--help)
            echo "Usage: ./install.sh [-y|--yes]"
            echo "Installs solana-dev (core) + solana-payments into ~/.claude/skills/"
            echo "For custom options: ./install-custom.sh"
            exit 0 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

print_banner
echo -e "This will install:"
echo -e "  ${BLUE}•${NC} solana-payments-skill → ${CYAN}$PAY_SKILL_PATH${NC}"
echo -e "  ${BLUE}•${NC} solana-dev-skill      → ${CYAN}$CORE_SKILL_PATH${NC}"
echo -e "  ${BLUE}•${NC} CLAUDE.md             → ${CYAN}$CLAUDE_MD_PATH${NC}"
echo ""

if [ "$SKIP_CONFIRM" = false ]; then
    read -p "Proceed? [Y/n] " -n 1 -r; echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then echo -e "${YELLOW}Cancelled${NC}"; exit 0; fi
fi

mkdir -p "$SKILLS_DIR" "$HOME/.claude"

echo -e "${CYAN}[1/3]${NC} Installing solana-dev-skill (core dependency)..."
if [ -d "$CORE_SKILL_PATH" ]; then echo -e "  ${YELLOW}→${NC} Removing existing"; rm -rf "$CORE_SKILL_PATH"; fi
temp_dir=$(mktemp -d)
if git clone --depth 1 --quiet https://github.com/solana-foundation/solana-dev-skill.git "$temp_dir" 2>/dev/null; then
    cp -r "$temp_dir/skill" "$CORE_SKILL_PATH"; rm -rf "$temp_dir"
    echo -e "  ${GREEN}✓${NC} $CORE_SKILL_PATH"
else
    rm -rf "$temp_dir"
    echo -e "  ${RED}✗${NC} Failed to clone solana-dev-skill — install manually:"
    echo -e "      https://github.com/solana-foundation/solana-dev-skill"
fi

echo -e "${CYAN}[2/3]${NC} Installing solana-payments-skill..."
if [ -d "$PAY_SKILL_PATH" ]; then echo -e "  ${YELLOW}→${NC} Removing existing"; rm -rf "$PAY_SKILL_PATH"; fi
mkdir -p "$PAY_SKILL_PATH"
cp -r "$SOURCE_DIR"/* "$PAY_SKILL_PATH/"
echo -e "  ${GREEN}✓${NC} $PAY_SKILL_PATH"

echo -e "${CYAN}[3/3]${NC} Installing CLAUDE.md..."
if [ -f "$CLAUDE_MD_PATH" ]; then echo -e "  ${YELLOW}→${NC} Backing up existing"; cp "$CLAUDE_MD_PATH" "$CLAUDE_MD_PATH.backup"; fi
cp "$SCRIPT_DIR/CLAUDE.md" "$CLAUDE_MD_PATH"
echo -e "  ${GREEN}✓${NC} $CLAUDE_MD_PATH"

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo -e "${CYAN}Try asking Claude:${NC}"
echo -e "  ${BLUE}•${NC} \"Add a Solana Pay checkout with verification to my Next.js store\""
echo -e "  ${BLUE}•${NC} \"Accept USDG and off-ramp to BRL via Pix\""
echo -e "  ${BLUE}•${NC} \"Audit my payment verification for double-fulfillment bugs\""
echo ""
