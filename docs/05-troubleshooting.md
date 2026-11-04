# 5. Troubleshooting

First step for almost everything: `docker compose ps` and `docker compose logs core --tail 50`.

| Problem | Likely cause | Safe fix |
|---|---|---|
| `wsl --install` fails / "Virtual Machine Platform" error | Virtualisation off in BIOS, Windows outdated | Enable Intel VT-x/AMD-V in BIOS; Windows Update; `wsl --update` |
| Docker Desktop stuck on "Starting" | WSL not updated, low RAM | `wsl --update`, `wsl --shutdown`, restart Docker Desktop |
| `docker version` has no "Server" / `error during connect … pipe/docker_engine` | Docker daemon not running | Start Docker Desktop; wait for "Engine running". Ubuntu: `sudo systemctl start docker` |
| `permission denied … docker.sock` (Ubuntu) | User not in `docker` group | `sudo usermod -aG docker $USER`, log out and back in |
| `docker-compose: command not found` | Old v1 command from the video | Use `docker compose` (space) |
| `yaml: line N: …` / `mapping values are not allowed` | Bad indentation or tabs in YAML | Use 2 spaces, no tabs; check with `docker compose config` |
| `tern-core` keeps restarting | Bad `settings.yml`, missing secret | `docker compose logs core`; ensure `SEARXNG_SECRET` in `.env` is not the placeholder |
| `Bind for 0.0.0.0:8080 failed: port is already allocated` | Another app uses the port (happened on the build PC: a Frappe project on 8080) | Change `HOST_PORT` in `.env` (Tern uses 8888). Find the owner: `Get-NetTCPConnection -LocalPort 8888 -State Listen` |
| Browser "can't reach localhost:8888" | Container down, wrong port, typo `https://` | `docker compose ps`; use `http://localhost:8888` |
| Phone can't open `http://<PC-IP>:8888` | `BIND_ADDRESS` still 127.0.0.1, firewall, phone on guest Wi-Fi | Set `BIND_ADDRESS=0.0.0.0`, `docker compose up -d`, allow Docker on Private network, same Wi-Fi |
| "No results" for everything | Engines blocked, no internet in containers, DNS | `docker exec tern-core wget -qO- https://example.org`, check `/stats`, try again later |
| `duckduckgo (CAPTCHA)` / `google (too many requests)` | Engine rate-limits your IP | Normal occasionally. Disable that engine for a while or rely on others (Brave, Wikipedia) |
| Valkey errors in log / `dbsize` stays 0 | `SEARXNG_VALKEY_URL` missing, Valkey down | `docker compose ps valkey`; `docker exec tern-valkey valkey-cli ping` → `PONG` |
| Caddy: `obtaining certificate … failed` | DNS not pointing to server yet, ports 80/443 closed, `TERN_HOSTNAME` wrong | `nslookup <domain>`; open 80/443 in cloud firewall + ufw; check `docker compose logs caddy` |
| Domain doesn't resolve | DNS not propagated / wrong A record | Wait (up to an hour), check A record = server IP |
| `ahmia/torch: can't register engine` | Tor engines without Tor proxy | Harmless; ignore or disable them in `settings.yml` |
| Custom CSS not loading (old look) | Browser cache (90 s), container not recreated | `docker compose up -d --force-recreate core`, then **Ctrl+Shift+R** |
| CSS loads but cut off / broken after an edit | File server cached old file size | Always `--force-recreate core` after editing `theme/static/` |
| Template edit not visible | Templates cached at start-up | `docker compose up -d --force-recreate core` |
| Template error page (500) after edit | Jinja syntax error | `docker compose logs core` shows file and line; fix or `git checkout -- theme/templates/<file>` |
| Theme broken after `docker compose pull` | Upstream changed an overridden template | `scripts/check-upstream.ps1`; re-apply `TERN` lines; or pin the old `SEARXNG_VERSION` |
| Logo shows "SearXNG" again | A mount line missing in compose | Compare `docker-compose.yml` with the repo; `docker compose config` |
| `.ps1 cannot be loaded because running scripts is disabled` | PowerShell execution policy | Run with `powershell -ExecutionPolicy Bypass -File .\scripts\<name>.ps1` |
| Git Bash: `exec: "C:/Program Files/Git/usr/bin/sh"` | Git Bash rewrites `/paths` in docker args | `export MSYS_NO_PATHCONV=1` first, or use PowerShell |
| `.env` appears in `git status` | `.gitignore` missing | Restore `.gitignore`; if already committed: `git rm --cached .env`, commit, **and generate a new secret** |
