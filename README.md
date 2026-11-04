# Tern: private search on your own computer

Self-hosted metasearch engine built on **SearXNG + Docker + Valkey**, with a custom, fast, accessible interface. Your server asks Brave, Google, DuckDuckGo, Wikipedia and others for you, merges the results, and shows them without ads, trackers or third-party requests.

> Not anonymity: engines still see your server's IP and your search words. See [docs/04-security.md](docs/04-security.md).

## Quick start (Windows, Docker Desktop running)

```powershell
Copy-Item .env.example .env
powershell -ExecutionPolicy Bypass -File .\scripts\new-secret.ps1
docker compose up -d
```
Open **http://localhost:8888**. Press `/` to jump to the search bar.

Ubuntu / WSL / macOS:
```bash
cp .env.example .env && sh scripts/new-secret.sh && docker compose up -d
```

## Everyday use
| I want to… | Do this |
|---|---|
| Stop / start | `docker compose stop` / `docker compose start` |
| See logs | `docker compose logs -f core` |
| Change settings | edit `core-config/settings.yml` → `docker compose restart core` |
| Change colours / fonts / spacing | edit `theme/static/tokens.css` → `docker compose up -d --force-recreate core` → **Ctrl+Shift+R** |
| Change quick-link tiles | edit `theme/templates/tern/quicklinks.html` → recreate core |
| Use it on my phone | see *Using Tern on your other devices* in [docs/03-setup-guide.md](docs/03-setup-guide.md) |
| Make it my default search engine | URL `http://localhost:8888/search?q=%s` (same guide) |
| Update safely | `docker compose pull` → `scripts/check-upstream.ps1` → `docker compose up -d` |
| Use the API | `http://localhost:8888/search?q=linux&format=json` |

## What's inside
| Path | Purpose |
|---|---|
| `docker-compose.yml` | `core` (SearXNG), `valkey` (cache), optional `caddy` (HTTPS, `--profile public`) |
| `core-config/settings.yml` | Instance name, safe search, autocomplete, engines, API formats |
| `design-system/skill.md` | Tern design system: tokens, components, accessibility, QA |
| `theme/` | Tokens, CSS, tiny JS, icons, 5 template overrides (+ upstream snapshots) |
| `scripts/` | Secret generator, update checker, contrast checker, icon generator |
| `docs/` | Blueprint, video analysis, setup guide, security, troubleshooting, test plan, report, enhancements |

## Assets and licences
| Asset | Licence |
|---|---|
| SearXNG | AGPL-3.0-or-later. If others use your modified instance, link your source (set in `settings.yml → brand`) |
| Valkey | BSD-3-Clause · Caddy: Apache-2.0 · Docker Engine: Apache-2.0 |
| Tern logo, icons, CSS, templates | Original work for this project (choose a licence for your repo; AGPL-3.0 matches SearXNG) |
| Fonts | None downloaded: operating-system fonts (Segoe UI, Roboto, San Francisco…) |
| Icons in the UI | SearXNG's bundled icons (AGPL, part of SearXNG) + Tern's own SVG mark |

Built and verified on 2026-11-04 with `searxng/searxng:2026.11.2-cccbc9e15`, `valkey/valkey:9-alpine`, Docker 29.6.2, Compose v5.3.1.
