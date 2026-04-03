#!/usr/bin/env bash
# scripts/deploy-to-exe-dev.sh
# Deploy Primordia to an exe.dev server so the fast "local" evolve flow
# (Claude Agent SDK + git worktrees) runs on the remote machine instead
# of requiring local setup.
#
# Usage:   bun run deploy-to-exe.dev <server-name>
# Example: bun run deploy-to-exe.dev primordia
#           → SSHes into primordia.exe.xyz
#           → installs git + bun if missing
#           → clones / updates the repo
#           → copies .env.local
#           → starts `bun run dev` (NODE_ENV=development, the fast local flow)
#
# Prerequisites:
#   - SSH key access to <server-name>.exe.xyz
#   - .env.local in the project root with all required secrets

set -euo pipefail

# ── Argument parsing ──────────────────────────────────────────────────────────

SERVER_NAME="${1:-}"

if [[ -z "$SERVER_NAME" ]]; then
  echo "Usage:   bun run deploy-to-exe.dev <server-name>"
  echo "Example: bun run deploy-to-exe.dev primordia"
  echo ""
  echo "  Installs and starts Primordia on <server-name>.exe.xyz."
  echo "  Requires SSH access to the server and .env.local in this directory."
  exit 1
fi

HOST="${SERVER_NAME}.exe.xyz"

# ── Verify prerequisites ──────────────────────────────────────────────────────

if [[ ! -f .env.local ]]; then
  echo "Error: .env.local not found."
  echo "Copy .env.example to .env.local and fill in your secrets first."
  exit 1
fi

GITHUB_REPO=$(grep '^GITHUB_REPO=' .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs 2>/dev/null || true)
if [[ -z "$GITHUB_REPO" ]]; then
  echo "Error: GITHUB_REPO is not set in .env.local"
  exit 1
fi

REPO_URL="https://github.com/${GITHUB_REPO}.git"
REMOTE_DIR="/home/exedev/primordia"

echo "Deploying Primordia to ${HOST}..."
echo "  Repository: ${REPO_URL}"
echo ""

# ── Copy .env.local to server ─────────────────────────────────────────────────
# Secrets are transferred via scp so they never appear in remote ps output.

echo "Copying .env.local to server..."
ssh "${HOST}" "mkdir -p ${REMOTE_DIR}"
scp .env.local "${HOST}:${REMOTE_DIR}/.env.local"
echo ""

# ── Remote setup ──────────────────────────────────────────────────────────────
# Variables from the local shell (REPO_URL, REMOTE_DIR) are expanded by the
# non-quoted heredoc before the script is sent to the server.
# All other dollar-signs are escaped (\$) so they run on the remote.

ssh "${HOST}" bash << ENDSSH
set -euo pipefail
export PATH="\$HOME/.bun/bin:\$PATH"

REPO_URL="${REPO_URL}"
REMOTE_DIR="${REMOTE_DIR}"

echo "=== Remote setup on \$(hostname) ==="
echo ""

# ── Install git ───────────────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  echo "Installing git..."
  if command -v apt-get &>/dev/null; then
    apt-get update -qq && apt-get install -y git curl
  elif command -v yum &>/dev/null; then
    yum install -y git curl
  else
    echo "Error: cannot install git (no recognized package manager found)"
    exit 1
  fi
fi

# ── Install bun ───────────────────────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  echo "Installing bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="\$HOME/.bun/bin:\$PATH"
fi

echo "  git \$(git --version)"
echo "  bun \$(bun --version)"
echo ""

# ── Configure git identity (needed for commits in the local evolve flow) ──────
git config --global user.name  "Primordia" 2>/dev/null || true
git config --global user.email "primordia@localhost" 2>/dev/null || true

# ── Clone or update the repo ──────────────────────────────────────────────────
if [[ -d "\${REMOTE_DIR}/.git" ]]; then
  echo "Updating repo to latest main..."
  git -C "\${REMOTE_DIR}" fetch --quiet origin
  git -C "\${REMOTE_DIR}" reset --hard origin/main
else
  echo "Cloning \${REPO_URL}..."
  # Stash the .env.local we already copied; restore it after clone overwrites the dir.
  cp "\${REMOTE_DIR}/.env.local" "/tmp/primordia.env.tmp" 2>/dev/null || true
  rm -rf "\${REMOTE_DIR}"
  git clone "\${REPO_URL}" "\${REMOTE_DIR}"
  mv "/tmp/primordia.env.tmp" "\${REMOTE_DIR}/.env.local" 2>/dev/null || true
fi

# ── Install dependencies ──────────────────────────────────────────────────────
echo "Installing dependencies..."
cd "\${REMOTE_DIR}"
bun install --frozen-lockfile
echo ""

# ── Build the production bundle ───────────────────────────────────────────────
echo "Building production bundle..."
cd "\${REMOTE_DIR}"
bun run build
echo ""

# ── Install / restart the systemd service ──────────────────────────────────────
echo "Installing systemd service..."
bash "\${REMOTE_DIR}/scripts/install-service.sh"

# ── Wait for Next.js "Ready" signal ──────────────────────────────────────────
echo ""
echo "Waiting for server to be ready (up to 60s)..."
for i in \$(seq 1 30); do
  sleep 2
  if journalctl -u primordia -n 50 --no-pager 2>/dev/null | grep -q "Ready"; then
    echo "  Server is ready!"
    break
  fi
  echo "  \$((i * 2))s..."
done

echo ""
echo "=== Recent service logs ==="
journalctl -u primordia -n 20 --no-pager || true
echo "==========================="
ENDSSH

echo ""
echo "Primordia is running on ${HOST}."
echo ""
echo "  Open:      http://${HOST}:3000"
echo "  Logs:      ssh ${HOST} 'journalctl -u primordia -f'"
echo "  Stop:      ssh ${HOST} 'sudo systemctl stop primordia'"
echo "  Redeploy:  bun run deploy-to-exe.dev ${SERVER_NAME}"
