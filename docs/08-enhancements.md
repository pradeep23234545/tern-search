# 8. Optional Enhancements

Do these only after every test in `06-test-plan.md` passes. All free.

## Essential (do these if anyone besides you uses it)
| Enhancement | How | Effort |
|---|---|---|
| Private access for selected users | Tailscale: share the machine with specific people (free plan) | Low |
| Basic authentication (public mode) | Caddy `basic_auth` block with a bcrypt hash from `docker compose run --rm caddy caddy hash-password` (**VERIFY BEFORE USE**: https://caddyserver.com/docs/caddyfile/directives/basic_auth) | Low |
| Limiter on | `SEARXNG_LIMITER=true` + `limiter.toml` (already provided) | Low |
| Pin versions | `SEARXNG_VERSION=<tag>`; update deliberately with the check-upstream script | Low |
| Automatic backups | Windows Task Scheduler running the tar command from the setup guide | Low |

## Optional
| Enhancement | How | Effort |
|---|---|---|
| Extra theme variants | Add `:root.theme-dark.tern-indigo {…}` token sets in `tokens.css` | Low |
| Personal engine profile | Preferences → Engines; share settings via the "URL to restore preferences" | Low |
| Custom category (e.g. "Study") | `settings.yml` → `categories_as_tabs` and per-engine `categories:` (**VERIFY**: https://docs.searxng.org/admin/settings/settings_categories_as_tabs.html) | Medium |
| Advanced filters | SearXNG search syntax: `!wp` (Wikipedia), `!gh` (GitHub), `:en` language | None |
| API usage | Script: `Invoke-RestMethod "http://localhost:8888/search?q=...&format=json"` → CSV report | Low |
| Usage statistics | `/stats` already enabled (`enable_metrics: true`) | Done |
| Privacy-friendly history | Browser history only; no server-side history recommended (privacy) | n/a |
| Editable quick links from the UI | Store tiles in `localStorage` with a small JS editor in `tern.js` (keeps data on the device) | Medium |
| Self-hosted font | Download Inter (SIL OFL 1.1) WOFF2 into `theme/static/fonts/`, `@font-face` in `tokens.css` | Low |
| Route engines through Tor | `outgoing: proxies:` in settings + a Tor container (**VERIFY**: https://docs.searxng.org/admin/settings/settings_outgoing.html) | High |
| Simple admin dashboard | Portainer CE (free) for container status | Medium |
