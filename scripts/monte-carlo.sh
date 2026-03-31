#!/bin/bash
# ═══════════════════════════════════════════════════════
# Farkle Frenzy — Monte Carlo RTP Simulation Runner
# Usage:   ./scripts/monte-carlo.sh [mode] [sessions] [flags]
# Flags:   -v (verbose), -t (export txt), -d (export docx)
# Example: ./scripts/monte-carlo.sh SOLO_FREE 4000 -v -t
# Modes:   SOLO_FREE, SOLO_CASINO, VS_FREE, VS_CASINO,
#          RALLY_FREE, RALLY_CASINO
# ═══════════════════════════════════════════════════════

CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RESET='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${BOLD}${CYAN}🎲 Farkle Frenzy — Monte Carlo Runner${RESET}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# Pass all args through to the TypeScript script
npx tsx scripts/monte-carlo.ts "$@"

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${CYAN}Done.${RESET}"
echo ""
