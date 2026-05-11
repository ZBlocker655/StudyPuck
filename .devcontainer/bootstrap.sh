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

expected_prettier_version="$(pnpm exec prettier --version)"

if ! command -v prettier >/dev/null 2>&1 || [ "$(prettier --version)" != "$expected_prettier_version" ]; then
	echo "Installing Prettier CLI..."
	npm install --global "prettier@$expected_prettier_version"
fi

if ! command -v bw >/dev/null 2>&1; then
	echo "Installing Bitwarden CLI..."
	npm install --global @bitwarden/cli
fi

if ! command -v copilot >/dev/null 2>&1; then
	echo "Installing GitHub Copilot CLI..."
	npm install --global @github/copilot
fi
