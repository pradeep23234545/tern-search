#!/usr/bin/env sh
# [Ubuntu/WSL terminal or Git Bash] After "docker compose pull", check whether
# SearXNG changed any template that Tern overrides.
# Usage (from the project folder):  sh scripts/check-upstream.sh
# No output under a file name = unchanged = Tern's override is still safe.
set -eu
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1   # stops Git Bash on Windows rewriting container paths

image="docker.io/searxng/searxng:${SEARXNG_VERSION:-latest}"
echo "Image version: $(docker run --rm --entrypoint cat "$image" /usr/local/searxng/searx/version_frozen.py 2>/dev/null | grep VERSION_STRING || echo unknown)"
echo "Snapshot taken from: $(cat theme/upstream-snapshot/VERSION)"

changed=0
for f in base.html index.html page_with_header.html manifest.json searxng-wordmark.min.svg; do
  tmp="$(mktemp)"
  docker run --rm --entrypoint cat "$image" "/usr/local/searxng/searx/templates/simple/$f" > "$tmp"
  if diff -q "theme/upstream-snapshot/$f" "$tmp" >/dev/null; then
    echo "unchanged  $f"
  else
    echo "CHANGED    $f   (upstream diff below; re-apply the TERN lines to theme/templates/$f)"
    diff -u "theme/upstream-snapshot/$f" "$tmp" || true
    changed=1
  fi
  rm -f "$tmp"
done

[ "$changed" -eq 0 ] && echo "All overridden templates match the snapshot. Safe to keep the theme as is."
exit 0
