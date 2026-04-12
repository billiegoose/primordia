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
  DIM="\033[2m"
  RESET="\033[0m"
else
  BOLD="" GREEN="" CYAN="" YELLOW="" RED="" DIM="" RESET=""
fi

info()    { echo -e "${CYAN}▸${RESET} $*"; }
success() { echo -e "${GREEN}✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET} $*"; }
die()     { echo -e "${RED}✗ $*${RESET}" >&2; exit 1; }
diag()    { echo -e "${DIM}  $*${RESET}"; }

# ── ERR trap ──────────────────────────────────────────────────────────────────
# Prints context when any command exits with a non-zero status.

_CURRENT_STEP="(initialising)"

trap 'echo -e "\n${RED}✗ Install failed${RESET} at step: ${BOLD}${_CURRENT_STEP}${RESET} (line ${LINENO})" >&2
echo -e "${DIM}  Re-run with:  bash -x install-for-exe-dev.sh  for verbose output${RESET}" >&2' ERR

# ── Banner ────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}  Primordia Installer for exe.dev${RESET}"
echo -e "  Creates a new VM in your exe.dev account and installs Primordia."
echo ""

# ── Diagnostics header ────────────────────────────────────────────────────────

_CURRENT_STEP="diagnostics"
diag "--- Diagnostics (paste this if something goes wrong) ---"
diag "Date:      $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
diag "OS:        $(uname -srm 2>/dev/null || echo 'unknown')"
if [[ -f /etc/os-release ]]; then
  diag "Distro:    $(. /etc/os-release && echo "${PRETTY_NAME:-$ID}")"
fi
diag "Shell:     ${SHELL:-unknown}  (bash ${BASH_VERSION})"
diag "User:      $(whoami)@$(hostname)"
diag "SSH:       $(ssh -V 2>&1 | head -1)"
# List public key filenames (no private key content)
SSH_KEYS=$(ls ~/.ssh/*.pub 2>/dev/null | xargs -I{} basename {} .pub | tr '\n' ' ' || echo "none found")
diag "SSH keys:  ${SSH_KEYS}"
diag "ssh-agent: ${SSH_AUTH_SOCK:-(not set)}"
diag "--------------------------------------------------------"
echo ""

# ── Check prerequisites ───────────────────────────────────────────────────────

_CURRENT_STEP="check prerequisites"
command -v ssh &>/dev/null || die "ssh is required but not found."

# ── Test exe.dev SSH access ───────────────────────────────────────────────────

_CURRENT_STEP="check exe.dev SSH"
info "Checking exe.dev SSH access..."
SSH_TEST_OUTPUT=$(ssh -o BatchMode=yes -o ConnectTimeout=10 exe.dev help 2>&1) || {
  echo ""
  echo -e "${DIM}  ssh output: ${SSH_TEST_OUTPUT}${RESET}" >&2
  die "Cannot connect to exe.dev via SSH.

  Set up SSH access first:
    1. Generate a key:  ssh-keygen -t ed25519
    2. Add it at:       https://exe.dev/settings
    3. Test it:         ssh exe.dev help"
}
success "Connected to exe.dev"
echo ""

# ── Prompt for VM name ────────────────────────────────────────────────────────

_CURRENT_STEP="prompt VM name"
VM_NAME="primordia"
if [[ -e /dev/tty ]]; then
  # Read from the terminal even when the script is piped through bash
  read -rp "  VM name [primordia]: " _input </dev/tty 2>/dev/null || true
  VM_NAME="${_input:-primordia}"
fi
info "VM name: ${BOLD}${VM_NAME}${RESET}"
echo ""

# ── Create VM ─────────────────────────────────────────────────────────────────

_CURRENT_STEP="create VM"
info "Creating VM '${VM_NAME}' on exe.dev..."
diag "Running: ssh exe.dev new ${VM_NAME} --json"
VM_JSON=$(ssh -o BatchMode=yes exe.dev new "${VM_NAME}" --json 2>&1) || {
  echo -e "${DIM}  Raw output:\n${VM_JSON}${RESET}" >&2
  die "Failed to create VM — see raw output above."
}
diag "VM JSON response: ${VM_JSON}"
success "VM created"

# Parse the public hostname from the JSON response
_CURRENT_STEP="parse VM hostname"
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
diag "Resolved hostname: ${VM_HOST}"

# ── Set port 3000 as the public port ──────────────────────────────────────────

_CURRENT_STEP="configure public port"
info "Setting port 3000 as the public port..."
diag "Running: ssh exe.dev share port ${VM_NAME} 3000"
SHARE_OUTPUT=$(ssh -o BatchMode=yes exe.dev share port "${VM_NAME}" 3000 2>&1) || {
  echo -e "${DIM}  share port output: ${SHARE_OUTPUT}${RESET}" >&2
  die "Failed to configure shared port."
}
diag "share port output: ${SHARE_OUTPUT}"

diag "Running: ssh exe.dev share set-public ${VM_NAME}"
SET_PUBLIC_OUTPUT=$(ssh -o BatchMode=yes exe.dev share set-public "${VM_NAME}" 2>&1) || {
  echo -e "${DIM}  set-public output: ${SET_PUBLIC_OUTPUT}${RESET}" >&2
  die "Failed to set port as public."
}
diag "set-public output: ${SET_PUBLIC_OUTPUT}"
success "Port 3000 is public at ${BOLD}https://${VM_HOST}/${RESET}"
echo ""

# ── Install Primordia on the VM ───────────────────────────────────────────────

_CURRENT_STEP="install Primordia on VM"
info "Installing Primordia on ${VM_HOST} (this takes a few minutes)..."
diag "SSHing into ${VM_HOST} to run remote setup..."
echo ""

# Run the full setup remotely.  The heredoc is a temporary file created by the
# local shell — it does not consume the pipe that feeds this script, so the
# install works correctly when run as `curl … | bash`.
ssh -o StrictHostKeyChecking=accept-new -tt "${VM_HOST}" bash << 'REMOTE'
set -euo pipefail

GREEN="\033[0;32m"; CYAN="\033[0;36m"; RED="\033[0;31m"; DIM="\033[2m"; BOLD="\033[1m"; RESET="\033[0m"
info()    { echo -e "${CYAN}▸${RESET} $*"; }
success() { echo -e "${GREEN}✓${RESET} $*"; }
diag()    { echo -e "${DIM}  $*${RESET}"; }

_REMOTE_STEP="(initialising)"
trap 'echo -e "\n${RED}✗ Remote setup failed${RESET} at step: ${BOLD}${_REMOTE_STEP}${RESET} (line ${LINENO})" >&2' ERR

# ── Remote diagnostics ─────────────────────────────────────────────────────────
_REMOTE_STEP="remote diagnostics"
diag "--- Remote host diagnostics ---"
diag "Hostname:  $(hostname -f 2>/dev/null || hostname)"
diag "OS:        $(uname -srm)"
diag "User:      $(whoami)"
diag "Disk:      $(df -h / 2>/dev/null | awk 'NR==2{print $4" free of "$2}' || echo 'unknown')"
diag "Memory:    $(free -h 2>/dev/null | awk '/^Mem:/{print $7" free of "$2}' || echo 'unknown')"
diag "--------------------------------"
echo ""

# ── Install git ────────────────────────────────────────────────────────────────
_REMOTE_STEP="install git"
if ! command -v git &>/dev/null; then
  info "Installing git..."
  sudo apt-get update -qq && sudo apt-get install -y git curl
fi
success "git $(git --version | awk '{print $3}')"

# ── Install bun ────────────────────────────────────────────────────────────────
_REMOTE_STEP="install bun"
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
_REMOTE_STEP="clone Primordia"
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
_REMOTE_STEP="run install.sh"
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
