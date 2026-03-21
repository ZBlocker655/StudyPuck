#!/usr/bin/env bash
set -euo pipefail

corepack enable
corepack prepare pnpm@8.15.0 --activate

echo "Verifying required tools..."
gh --version >/dev/null
pnpm --version

echo "Installing workspace dependencies..."
pnpm install --frozen-lockfile
