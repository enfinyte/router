#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(pwd)/packages"

API_PLATFORM="$PROJECT_ROOT/api_platform"
BACKEND="$PROJECT_ROOT/backend"
FRONTEND="$PROJECT_ROOT/frontend"
VAULT="$PROJECT_ROOT/vault"

cleanup() {
  echo "Shutting down servers..."
  kill -- -$$ 2>/dev/null
}

start_vault() {
  echo "[1/4] Starting vault ..."
  cd "$VAULT"
  podman-compose up # >podman.log 2>&1 &
  sleep 2
  bun run init.ts >init.log 2>&1 &
}

start_backend() {
  echo "[2/4] Starting backend ..."
  cd "$BACKEND"
  bun run src/index.ts # >backend.log 2>&1 &
}

start_frontend() {
  echo "[3/4] Starting frontend ..."
  cd "$FRONTEND"
  bun run dev >frontend.log 2>&1 &
}

start_api_platform() {
  echo "[4/4] Starting api_platform ..."
  cd "$API_PLATFORM"
  bun run src/index.ts >api_platform.log 2>&1 &
}

# start_vault
start_backend
start_api_platform
start_frontend

trap cleanup EXIT INT TERM

echo "[4/4] Running..."
wait
