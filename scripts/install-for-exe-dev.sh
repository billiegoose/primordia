#!/usr/bin/env bash
# scripts/install-for-exe-dev.sh
# Run this on your personal computer to create a new Primordia VM on exe.dev.
#
# Usage:
#   curl -fsSL https://primordia.exe.xyz/install-for-exe-dev.sh | bash
#
# Prerequisites:
#   - An exe.dev account with SSH access configured
#   - ssh exe.dev must work without a password prompt
#     (see https://exe.dev/docs/ssh.md for setup instructions)

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────

if [[ -t 1 ]] || [[ -e /dev/tty ]]; then
  BOLD="\033[1m"
  GREEN="\033[0;32m"
  CYAN="\033[0;36m"
  YELLOW="\033[0;33m"
  RED="\033[0;31m"
  RESET="\033[0m"
else
  BOLD="" GREEN="" CYAN="" YELLOW="" RED="" RESET=""
fi

info()    { echo -e "${CYAN}▸${RESET} $*"; }
success() { echo -e "${GREEN}✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET} $*"; }
die()     { echo -e "${RED}✗ $*${RESET}" >&2; exit 1; }

# ── Banner ────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}  Primordia Installer for exe.dev${RESET}"
echo -e "  Creates a new VM in your exe.dev account and installs Primordia."
echo ""

# ── Check prerequisites ───────────────────────────────────────────────────────

command -v ssh &>/dev/null || die "ssh is required but not found."

# ── Test exe.dev SSH access ───────────────────────────────────────────────────

info "Checking exe.dev SSH access..."
if ! ssh -o BatchMode=yes -o ConnectTimeout=10 exe.dev help &>/dev/null 2>&1; then
  echo ""
  die "Cannot connect to exe.dev via SSH.

  Set up SSH access first:
    1. Generate a key:  ssh-keygen -t ed25519
    2. Add it at:       https://exe.dev/settings
    3. Test it:         ssh exe.dev help"
fi
success "Connected to exe.dev"
echo ""

# ── Prompt for VM name ────────────────────────────────────────────────────────

VM_NAME="primordia"
if [[ -e /dev/tty ]]; then
  # Read from the terminal even when the script is piped through bash
  read -rp "  VM name [primordia]: " _input </dev/tty 2>/dev/null || true
  VM_NAME="${_input:-primordia}"
fi
info "VM name: ${BOLD}${VM_NAME}${RESET}"
echo ""

# ── Create VM ─────────────────────────────────────────────────────────────────

info "Creating VM '${VM_NAME}' on exe.dev..."
VM_JSON=$(ssh -o BatchMode=yes exe.dev new "${VM_NAME}" --json 2>&1) || \
  die "Failed to create VM.\n\n  Output: ${VM_JSON}"
success "VM created"

# Parse the public hostname from the JSON response
VM_HOST=""
if command -v python3 &>/dev/null; then
  VM_HOST=$(python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('hostname',''))" \
    <<< "$VM_JSON" 2>/dev/null || true)
fi
if [[ -z "$VM_HOST" ]] && command -v jq &>/dev/null; then
  VM_HOST=$(jq -r '.hostname // empty' <<< "$VM_JSON" 2>/dev/null || true)
fi
# Fall back to the predictable hostname pattern
[[ -z "$VM_HOST" ]] && VM_HOST="${VM_NAME}.exe.xyz"

# ── Set port 3000 as the public port ──────────────────────────────────────────

info "Setting port 3000 as the public port..."
ssh -o BatchMode=yes exe.dev share port  "${VM_NAME}" 3000
ssh -o BatchMode=yes exe.dev share set-public "${VM_NAME}"
success "Port 3000 is public at ${BOLD}https://${VM_HOST}/${RESET}"
echo ""

# ── Install Primordia on the VM ───────────────────────────────────────────────

info "Installing Primordia on ${VM_HOST} (this takes a few minutes)..."
echo ""

# Run the full setup remotely.  The heredoc is a temporary file created by the
# local shell — it does not consume the pipe that feeds this script, so the
# install works correctly when run as `curl … | bash`.
ssh -o StrictHostKeyChecking=accept-new -tt "${VM_HOST}" bash << 'REMOTE'
set -euo pipefail

GREEN="\033[0;32m"; CYAN="\033[0;36m"; RESET="\033[0m"
info()    { echo -e "${CYAN}▸${RESET} $*"; }
success() { echo -e "${GREEN}✓${RESET} $*"; }

# ── Install git ────────────────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  info "Installing git..."
  sudo apt-get update -qq && sudo apt-get install -y git curl
fi
success "git $(git --version | awk '{print $3}')"

# ── Install bun ────────────────────────────────────────────────────────────────
export PATH="$HOME/.bun/bin:$PATH"
if ! command -v bun &>/dev/null; then
  info "Installing bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi
success "bun $(bun --version)"

git config --global user.name  "Primordia" 2>/dev/null || true
git config --global user.email "primordia@localhost" 2>/dev/null || true

echo ""

# ── Clone Primordia ────────────────────────────────────────────────────────────
if [[ -d "$HOME/primordia/.git" ]]; then
  info "Primordia already present — pulling latest changes..."
  git -C "$HOME/primordia" pull
else
  info "Cloning Primordia..."
  git clone https://primordia.exe.xyz/api/git "$HOME/primordia"
fi
success "Primordia cloned to ~/primordia"

echo ""

# ── Run the install script (no API key prompts — check_keys handles that) ──────
cd "$HOME/primordia"
bash scripts/install.sh
REMOTE

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${GREEN}  Primordia is running!${RESET}"
echo ""
echo -e "  Open:  ${BOLD}https://${VM_HOST}/${RESET}"
echo ""
echo -e "  Sign in with your exe.dev account. Any missing configuration"
echo -e "  (API keys etc.) will be requested on first login."
echo ""
