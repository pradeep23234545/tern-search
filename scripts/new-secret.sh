#!/usr/bin/env sh
# [Ubuntu/WSL terminal] Generate a random SEARXNG_SECRET and write it into .env.
# Usage (from the project folder):  sh scripts/new-secret.sh
# The secret is never printed on screen.
set -eu

cd "$(dirname "$0")/.."
[ -f .env ] || { cp .env.example .env; echo "Created .env from .env.example"; }

secret="$(openssl rand -hex 32)"

if grep -q '^SEARXNG_SECRET=' .env; then
  sed -i.bak "s|^SEARXNG_SECRET=.*|SEARXNG_SECRET=${secret}|" .env && rm -f .env.bak
else
  printf 'SEARXNG_SECRET=%s\n' "$secret" >> .env
fi
chmod 600 .env

echo "New SEARXNG_SECRET written to .env (64 hex characters, not shown)."
echo "Restart to apply:  docker compose up -d"
