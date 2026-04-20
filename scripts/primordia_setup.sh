#!/usr/bin/env bash
# scripts/primordia_setup.sh
# Remote VM bootstrap: installs git, clones Primordia, then runs scripts/install.sh.
# Served at /setup.sh and downloaded + executed by scripts/install-for-exe-dev.sh.
#
# Usage (direct):
#   bash <(curl -fsSL https://primordia.exe.xyz/setup.sh) [REVERSE_PROXY_PORT]

REVERSE_PROXY_PORT="${1:-8000}"

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# ── Colors & helpers ──────────────────────────────────────────────────────────
# Define colors first so we can use them for the locale success message.
GREEN="\033[0;32m"; CYAN="\033[0;36m"; RED="\033[0;31m"; BOLD="\033[1m"; RESET="\033[0m"
# All remote output is indented 2 spaces to nest visually under the local steps.
# _step: print spinner line (no newline) — replaced by _done on success
# _done: stop spinner and overwrite line with ✓
_SPINNER_PID=""
_step() {
  local msg="$*"
  printf '  \\ %s' "$msg"
  ( local i=1; local c='\|/-'
    while true; do sleep 0.12; printf '\r  %s %s' "${c:$((i % 4)):1}" "$msg"; i=$((i+1)); done ) &
  _SPINNER_PID=$!
  disown "$_SPINNER_PID" 2>/dev/null || true
}
_done() {
  if [[ -n "${_SPINNER_PID:-}" ]]; then
    kill "$_SPINNER_PID" 2>/dev/null || true; wait "$_SPINNER_PID" 2>/dev/null || true; _SPINNER_PID=""
  fi
  printf "\r\033[K  ${GREEN}✓${RESET} %s\n" "$*"
}
_spin_kill() {
  if [[ -n "${_SPINNER_PID:-}" ]]; then
    kill "$_SPINNER_PID" 2>/dev/null || true; wait "$_SPINNER_PID" 2>/dev/null || true; _SPINNER_PID=""
  fi
  printf "\r\033[K"
}
info()    { echo -e "  ${CYAN}▸${RESET} $*"; }
success() { echo -e "  ${GREEN}✓${RESET} $*"; }

_REMOTE_STEP="(initialising)"
trap 'echo -e "\n${RED}✗ Remote setup failed${RESET} at step: ${BOLD}${_REMOTE_STEP}${RESET} (line ${LINENO})" >&2' ERR

# ── Wait for DNS ──────────────────────────────────────────────────────────────
# Fresh VMs have a race where systemd-resolved starts before the NIC is ready,
# leaving DNS broken for up to 120 s.
_REMOTE_STEP="wait for DNS"
_dns_ready() { getent hosts registry.npmjs.org >/dev/null 2>&1; }
if _dns_ready; then
  success "DNS is ready"
else
  _step "Waiting for DNS resolver..."
  sudo resolvectl flush-caches 2>/dev/null || true
  if ! grep -q "127.0.0.53" /etc/resolv.conf 2>/dev/null; then
    sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf 2>/dev/null || true
  fi
  if resolvectl status 2>/dev/null | grep -q "Current Scopes: none"; then
    sudo systemctl restart systemd-networkd 2>/dev/null || true
    sudo systemd-networkd-wait-online --timeout=15 2>/dev/null || sleep 5
    sudo systemctl restart systemd-resolved 2>/dev/null || true
    sleep 2
  fi
  _dns_ok=false
  for _i in $(seq 1 30); do
    if _dns_ready; then _dns_ok=true; break; fi
    sleep 2
  done
  if [[ "$_dns_ok" != "true" ]]; then
    printf "\nnameserver 1.1.1.1\nnameserver 8.8.8.8\n" | sudo tee /etc/resolv.conf >/dev/null
    sleep 1
    if ! _dns_ready; then
      _spin_kill
      echo -e "${RED}✗ DNS resolution failed — cannot continue${RESET}" >&2; exit 1
    fi
  fi
  _done "DNS is ready"
fi

# ── Set locale ────────────────────────────────────────────────────────────────
# Install and generate en_US.UTF-8 BEFORE exporting LC_ALL to avoid the
# "setlocale: LC_ALL: cannot change locale" bash warning.
_REMOTE_STEP="set locale"
_step "Setting locale..."
sudo apt-get install -y locales </dev/null >/dev/null 2>&1 || true
sudo locale-gen en_US.UTF-8 </dev/null >/dev/null 2>&1 || true
sudo update-locale LANG=en_US.UTF-8 </dev/null >/dev/null 2>&1 || true
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 LANGUAGE=en_US.UTF-8
_done "Updated locale to en_US.UTF-8 for better character support"

# ── Install git ───────────────────────────────────────────────────────────────
_REMOTE_STEP="install git"
if ! command -v git &>/dev/null; then
  _step "Installing git..."
  sudo apt-get update -qq </dev/null >/dev/null 2>&1
  sudo apt-get install -y git </dev/null >/dev/null 2>&1
  _done "Using git $(git --version | awk '{print $3}')"
else
  success "Using git $(git --version | awk '{print $3}')"
fi
git config --global user.name  "Primordia" 2>/dev/null || true
git config --global user.email "primordia@localhost" 2>/dev/null || true

# ── Clone Primordia ───────────────────────────────────────────────────────────
_REMOTE_STEP="clone Primordia"
if [[ -d "$HOME/primordia/.git" ]]; then
  _step "Updating ~/primordia..."
  _log=$(mktemp)
  if ! git -C "$HOME/primordia" pull >"$_log" 2>&1; then _spin_kill; cat "$_log" >&2; rm -f "$_log"; exit 1; fi
  rm -f "$_log"
  _done "Updated ~/primordia"
else
  _step "Cloning Primordia..."
  _log=$(mktemp)
  if ! git clone https://primordia.exe.xyz/api/git "$HOME/primordia" >"$_log" 2>&1; then _spin_kill; cat "$_log" >&2; rm -f "$_log"; exit 1; fi
  rm -f "$_log"
  _done "Cloned to ~/primordia"
fi

# ── Run install.sh ────────────────────────────────────────────────────────────
_REMOTE_STEP="run install.sh"
echo ""
echo "Now we install Primordia using its installer:"
echo ""
echo "Running ~/primordia/scripts/install.sh:"
export INSTALL_PREFIX="  "
REVERSE_PROXY_PORT="$REVERSE_PROXY_PORT" bash "$HOME/primordia/scripts/install.sh"
