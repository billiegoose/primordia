#!/usr/bin/env bash
# scripts/install-service.sh
# Installs (or re-installs) the Primordia systemd services.
# Run once on the server after cloning/updating the repo.
# Also called automatically by the accept-into-prod flow with the new worktree path.
#
# Usage:
#   bash scripts/install-service.sh                          # First install
#   bash scripts/install-service.sh /path/to/new/worktree   # Called by accept-into-prod

set -euo pipefail

PROD_PATH="${1:-}"  # Optional: new prod worktree path (provided by accept-into-prod flow)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_SRC="${SCRIPT_DIR}/primordia.service"
SERVICE_DST="/etc/systemd/system/primordia.service"
PROXY_SERVICE_SRC="${SCRIPT_DIR}/primordia-proxy.service"
PROXY_SERVICE_DST="/etc/systemd/system/primordia-proxy.service"
DROP_IN_DIR="/etc/systemd/system/primordia.service.d"
DROP_IN_CONF="${DROP_IN_DIR}/prod-slot.conf"

REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKTREES_DIR="${REPO_ROOT}/../primordia-worktrees"
mkdir -p "${WORKTREES_DIR}"

echo "Installing Primordia systemd services..."

# Symlink the service unit files from the repo into systemd.
sudo ln -sf "${SERVICE_SRC}" "${SERVICE_DST}"
echo "  Symlinked: ${SERVICE_DST} -> ${SERVICE_SRC}"

sudo ln -sf "${PROXY_SERVICE_SRC}" "${PROXY_SERVICE_DST}"
echo "  Symlinked: ${PROXY_SERVICE_DST} -> ${PROXY_SERVICE_SRC}"

# Install the reverse proxy script to a stable absolute path.
# The proxy systemd unit (primordia-proxy.service) references this path directly,
# so the service file never needs to follow a symlink to find the script.
PROXY_STABLE="$HOME/primordia-proxy.ts"
cp "${SCRIPT_DIR}/reverse-proxy.ts" "${PROXY_STABLE}"
echo "  Installed proxy script: ${PROXY_STABLE}"

# Initialise the PROD symbolic-ref so the reverse proxy knows which branch is
# production. Only set on first install — never overwrite a live PROD pointer.
if ! git -C "${REPO_ROOT}" symbolic-ref PROD >/dev/null 2>&1; then
  git -C "${REPO_ROOT}" symbolic-ref PROD refs/heads/main
  echo "  Initialized PROD symbolic-ref → refs/heads/main"
else
  echo "  PROD symbolic-ref already set → $(git -C "${REPO_ROOT}" symbolic-ref --short PROD)"
fi

# Write the systemd drop-in that sets WorkingDirectory and EnvironmentFile for
# the primordia app service. The base primordia.service points to the main repo
# as a fallback; this drop-in overrides it with the actual production worktree.
# Updated on each accept-into-prod to track the current production slot.
sudo mkdir -p "${DROP_IN_DIR}"
if [[ -n "${PROD_PATH}" ]]; then
  # Called from accept-into-prod: update drop-in to the new worktree.
  printf '[Service]\nWorkingDirectory=%s\nEnvironmentFile=%s/.env.local\n' \
    "${PROD_PATH}" "${PROD_PATH}" \
    | sudo tee "${DROP_IN_CONF}" > /dev/null
  echo "  Updated prod slot drop-in → ${PROD_PATH}"
elif [[ ! -f "${DROP_IN_CONF}" ]]; then
  # First install: point the drop-in to the main repo (initial production slot).
  printf '[Service]\nWorkingDirectory=%s\nEnvironmentFile=%s/.env.local\n' \
    "${REPO_ROOT}" "${REPO_ROOT}" \
    | sudo tee "${DROP_IN_CONF}" > /dev/null
  echo "  Created initial prod slot drop-in → ${REPO_ROOT}"
  # Initialise the git config slot tracker so accept/rollback routes can read it.
  git -C "${REPO_ROOT}" config primordia.current-slot "${REPO_ROOT}"
  echo "  Initialized primordia.current-slot → ${REPO_ROOT}"
else
  echo "  Prod slot drop-in already exists, not overwriting."
fi

# Kill any legacy nohup process so we don't double-run.
if [[ -f "$HOME/primordia.pid" ]]; then
  OLD_PID=$(cat "$HOME/primordia.pid" 2>/dev/null || true)
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "  Stopping legacy nohup process (PID $OLD_PID)..."
    kill "$OLD_PID" 2>/dev/null || true
    sleep 1
  fi
  rm -f "$HOME/primordia.pid"
fi

sudo systemctl daemon-reload
sudo systemctl enable primordia
sudo systemctl enable primordia-proxy
echo "  Enabled on boot."

if [[ -n "${PROD_PATH}" ]]; then
  # Called from accept-into-prod: daemon-reload already applied the drop-in.
  # The proxy manages live traffic via PROD symbolic-ref; the app service will
  # use the new slot the next time systemd starts it (e.g. on failure recovery).
  echo "  Daemon reloaded — app service will use new slot on next restart."
else
  # First install: start both services now.
  sudo systemctl restart primordia
  sudo systemctl restart primordia-proxy
  echo ""
  echo "Done! Useful commands:"
  echo "  sudo systemctl restart primordia        # restart app"
  echo "  sudo systemctl restart primordia-proxy  # restart proxy"
  echo "  sudo systemctl stop primordia           # stop app"
  echo "  sudo systemctl status primordia         # app status"
  echo "  sudo systemctl status primordia-proxy   # proxy status"
  echo "  journalctl -u primordia -f              # tail app logs"
  echo "  journalctl -u primordia-proxy -f        # tail proxy logs"
fi
