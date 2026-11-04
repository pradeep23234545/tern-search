# 2. Transcript Analysis and Verification

Source: NetworkChuck, YouTube `ifT6npY39Dw` (recorded around 2022: Ubuntu 20.04, `docker-compose` v1).
Labels: **[FROM VIDEO]** said or shown in the transcript · **[INFERRED]** implied but not stated · **[MY RECOMMENDATION]** added for this project.
Verified on **2026-11-04** against the live official docs and the actual `searxng/searxng:2026.11.2-cccbc9e15` image running on this PC.

## 2.1 What the video contains

| Area | Item | Label |
|---|---|---|
| Technologies | SearXNG (fork of searx), Docker, docker-compose, Caddy, Redis, Git, nano | [FROM VIDEO] |
| OS | Ubuntu 20.04 on a Linode cloud VM; also Kali Linux VM at home | [FROM VIDEO] |
| Hardware | "$5/month" Linode; "anything that runs Docker", e.g. Raspberry Pi | [FROM VIDEO] |
| Containers | 3 containers: caddy, searxng, redis | [FROM VIDEO] |
| Container purposes | Caddy = HTTPS front door; SearXNG = search; Redis = cache/limiter | [INFERRED] (video only names them) |
| Commands | `sudo apt update`, `sudo apt upgrade`, `sudo apt install docker.io -y`, `sudo apt install docker-compose -y`, `apt install git`, `cd /usr/local`, `git clone …searxng-docker`, `cd searxng-docker`, `ls`, `ll`, `nano .env`, *a command that writes a secret key*, `sudo docker-compose up -d`, `sudo docker ps`, `sudo docker-compose down`, `cd searxng`, `sudo nano settings.yml` | [FROM VIDEO] |
| Exact clone URL / secret command | Not spoken ("I'm gonna paste this command") | Missing |
| Config files | `.env`, `docker-compose.yaml`, `searxng/settings.yml` | [FROM VIDEO] |
| Env variables | Domain name and Let's Encrypt email in `.env` (commented by default → localhost) | [FROM VIDEO] |
| Deployment | DNS A record → server IP, edit `.env`, generate secret, `docker-compose up -d` | [FROM VIDEO] |
| Customisations | `server: method: GET` (back-button fix), `general: instance_name`, `enable_metrics`, `search: safe_search: 2`, `autocomplete: duckduckgo` | [FROM VIDEO] |
| Testing | Search "coffee", check sources, back button, autocomplete, `/stats` page | [FROM VIDEO] |
| Features mentioned | 70+ engines, enable/disable engines, SQL/database engines, proxies/Tor, public vs private instance, API | [FROM VIDEO] |
| Not explained | Firewall, what Redis does, secret key purpose, updates/backup, how to reach a home instance from a phone, limiter, HTTPS without a domain, Windows | Missing |

## 2.2 Outdated items and current replacements

| Video (2022) | Status 2026-11-04 | Current approach used in Tern |
|---|---|---|
| `git clone` **searxng-docker** repo | **Deprecated 2026-03-28.** README: "*searxng-docker* repository is superseded." | Official template from `searxng/searxng` → `container/docker-compose.yml` + `.env.example` ([docs](https://docs.searxng.org/admin/installation-docker.html#compose-instancing)) |
| **Redis** container | Replaced by **Valkey** (`docker.io/valkey/valkey:9-alpine`) in the official template | Valkey, wired up with `SEARXNG_VALKEY_URL` |
| `docker-compose` (v1, hyphen) | Compose v1 is end-of-life | `docker compose` (v2 plugin; v5.3.1 here) |
| `sudo apt install docker.io` | Works but often old | Docker Desktop (Windows) or Docker's official apt repo (Ubuntu) |
| Folder `searxng/settings.yml` | Now `core-config/settings.yml` mounted at `/etc/searxng/` | Same |
| Caddy inside the default stack | Official template has **no** reverse proxy (2 services: `core`, `valkey`) | Caddy kept as an *optional* `public` profile |
| `method: GET` "to fix the back button" | `GET` is **already the default** (`method: "GET"` in shipped settings) | Kept explicit in settings for clarity |
| uWSGI server | Image now uses **Granian** (`GRANIAN_*` variables) | No action needed |
| Port 8080 | Still the container port | Host port **8888** here because 8080 was already used by a Frappe project on this PC |
| `cd /usr/local` + `sudo` everywhere | Works; unnecessary on Docker Desktop | Project lives in your user folder; no `sudo` on Windows |
| `safe_search: 2` | Valid (0/1/2) | Default 1 (moderate); 2 shown as option |
| Default valkey/redis | Shipped default is `valkey: url: false` (no cache!) and the official compose does **not** set a URL | Tern sets `SEARXNG_VALKEY_URL=valkey://valkey:6379/0` (verified: `valkey-cli dbsize` > 0) |
| "Complete privacy/anonymity" | Overstated | See `docs/04-security.md` |

## 2.3 Verified facts (checked, not assumed)

| Item | How verified | Result |
|---|---|---|
| Image names | `docker pull` | `docker.io/searxng/searxng:latest` (= 2026.11.2-cccbc9e15), `docker.io/valkey/valkey:9-alpine` |
| Config path | Image env `__SEARXNG_SETTINGS_PATH` | `/etc/searxng/settings.yml`; data `/var/cache/searxng` |
| First boot | Container log | Creates `settings.yml` with a random `secret_key` if missing |
| Env variables | `grep` in `searx/settings_defaults.py` | `SEARXNG_SECRET, SEARXNG_PORT, SEARXNG_BIND_ADDRESS, SEARXNG_BASE_URL, SEARXNG_LIMITER, SEARXNG_PUBLIC_INSTANCE, SEARXNG_IMAGE_PROXY, SEARXNG_METHOD, SEARXNG_VALKEY_URL, SEARXNG_DEBUG` |
| Theme files | `ls` inside container | Templates: `/usr/local/searxng/searx/templates/simple/`; static: `/usr/local/searxng/searx/static/themes/simple/` |
| Static serving | `webapp.py` | WhiteNoise serves the static folder; it indexes files at start-up → **recreate the container after CSS edits** |
| UI keys | [settings_ui docs](https://docs.searxng.org/admin/settings/settings_ui.html) | `default_theme`, `theme_args.simple_style` (auto/light/dark/black), `center_alignment`, `query_in_title`, `hotkeys`, `url_formatting`, `search_on_category_select`, `results_on_new_tab` |
| Theme customisation | Docs + source | No officially supported custom-theme mechanism. `ui.templates_path`/`static_path` exist but replace whole folders (fragile). Tern overrides individual files via read-only bind mounts, which is unofficial but minimal; `scripts/check-upstream` detects upstream changes |
| Caddyfile | `caddy validate` | "Valid configuration" |
| Limiter keys | Copied from shipped `searx/limiter.toml` | `[botdetection]`, `[botdetection.ip_limit] link_token`, `[botdetection.ip_lists]` |

**Pages to re-check before a future update (VERIFY BEFORE USE):**
- https://docs.searxng.org/admin/installation-docker.html
- https://docs.searxng.org/admin/settings/index.html
- https://github.com/searxng/searxng/tree/master/container
- https://caddyserver.com/docs/caddyfile
- https://docs.docker.com/desktop/setup/install/windows-install/
