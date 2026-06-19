#!/bin/bash
# Solana Payments Skill - Custom Installer (full options)
set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/skill"

echo ""
echo -e "${CYAN}Solana Payments Skill — Custom Install${NC}"
echo ""
echo "Install location:"
echo "  1) Personal  (~/.claude/skills/)"
echo "  2) Project   (./.claude/skills/)"
echo "  3) Custom path"
read -p "Choice [1]: " loc; loc=${loc:-1}
case "$loc" in
    1) SKILLS_DIR="$HOME/.claude/skills"; CLAUDE_DIR="$HOME/.claude" ;;
    2) SKILLS_DIR="$(pwd)/.claude/skills"; CLAUDE_DIR="$(pwd)" ;;
    3) read -p "Enter skills dir: " SKILLS_DIR; read -p "Enter CLAUDE.md dir: " CLAUDE_DIR ;;
    *) echo "Invalid"; exit 1 ;;
esac

PAY_SKILL_PATH="$SKILLS_DIR/solana-payments"
CORE_SKILL_PATH="$SKILLS_DIR/solana-dev"

INSTALL_CORE=true
if [ -d "$CORE_SKILL_PATH" ]; then
    echo ""
    read -p "solana-dev-skill already present. Reinstall it? [y/N] " -n 1 -r; echo
    [[ $REPLY =~ ^[Yy]$ ]] || INSTALL_CORE=false
fi

read -p "Copy CLAUDE.md to $CLAUDE_DIR? [Y/n] " -n 1 -r; echo
COPY_CLAUDE=true; [[ $REPLY =~ ^[Nn]$ ]] && COPY_CLAUDE=false

mkdir -p "$SKILLS_DIR" "$CLAUDE_DIR"

if [ "$INSTALL_CORE" = true ]; then
    echo -e "${CYAN}Installing solana-dev-skill...${NC}"
    [ -d "$CORE_SKILL_PATH" ] && rm -rf "$CORE_SKILL_PATH"
    temp_dir=$(mktemp -d)
    if git clone --depth 1 --quiet https://github.com/solana-foundation/solana-dev-skill.git "$temp_dir" 2>/dev/null; then
        cp -r "$temp_dir/skill" "$CORE_SKILL_PATH"; rm -rf "$temp_dir"
        echo -e "  ${GREEN}✓${NC} $CORE_SKILL_PATH"
    else
        rm -rf "$temp_dir"; echo -e "  ${RED}✗${NC} clone failed — install manually"
    fi
fi

echo -e "${CYAN}Installing solana-payments-skill...${NC}"
[ -d "$PAY_SKILL_PATH" ] && rm -rf "$PAY_SKILL_PATH"
mkdir -p "$PAY_SKILL_PATH"; cp -r "$SOURCE_DIR"/* "$PAY_SKILL_PATH/"
echo -e "  ${GREEN}✓${NC} $PAY_SKILL_PATH"

if [ "$COPY_CLAUDE" = true ]; then
    [ -f "$CLAUDE_DIR/CLAUDE.md" ] && cp "$CLAUDE_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md.backup"
    cp "$SCRIPT_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"
    echo -e "  ${GREEN}✓${NC} $CLAUDE_DIR/CLAUDE.md"
fi

echo ""
echo -e "${GREEN}Done.${NC} Agents in agents/, commands in commands/, rules in rules/."
echo ""
