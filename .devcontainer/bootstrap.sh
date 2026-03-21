#!/usr/bin/env bash
set -euo pipefail

mkdir -p "$HOME/.local/bin"
corepack enable --install-directory "$HOME/.local/bin"
corepack prepare pnpm@8.15.0 --activate
export PATH="$HOME/.local/bin:$PATH"
export npm_config_prefix="$HOME/.local"

echo "Verifying required tools..."
gh --version >/dev/null
pnpm --version

echo "Installing workspace dependencies..."
pnpm install --frozen-lockfile

if ! command -v copilot >/dev/null 2>&1; then
	echo "Installing GitHub Copilot CLI..."
	npm install --global @github/copilot
fi
