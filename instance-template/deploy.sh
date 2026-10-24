#!/bin/bash
set -e

# Your private instance repo (this dir) + your clone of the public Daemon framework
DAEMON_FRAMEWORK="${HOME}/Projects/daemon"
DAEMON_DATA="$(cd "$(dirname "$0")" && pwd)"

echo "Running DeployGate (TTL + location + credential checks)..."
bun "$DAEMON_DATA/DeployGate.ts"

# Never leave personal data in the public framework working dir — the trap runs
# on success AND on failure, so a broken build or deploy can't strand the copy
cleanup() {
  rm -f "$DAEMON_FRAMEWORK/cms/public/daemon-data.json" "$DAEMON_FRAMEWORK/cms/.vitepress/dist/daemon-data.json"
}
trap cleanup EXIT

echo "Deploying daemon..."
cp "$DAEMON_DATA/daemon-data.json" "$DAEMON_FRAMEWORK/cms/public/daemon-data.json"
cd "$DAEMON_FRAMEWORK" && bun run build
bunx wrangler deploy

echo "Deploy complete."
