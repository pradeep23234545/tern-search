# 3. Setup Guide (Stages 1–8)

Every command is tagged: **[Windows PowerShell]**, **[Ubuntu/WSL terminal]** or **[Cloud server]**. Run project commands from the project folder (the one containing `docker-compose.yml`). Docker commands are identical in PowerShell and Ubuntu.

---

## Stage 1: Environment

### 1.1 Check what you have
**[Windows PowerShell]**
```powershell
wsl --status
docker version
docker compose version
git --version
```
**Expected:** a WSL default version of 2, Docker *Client* and *Server* sections, Compose v2 or newer, a Git version. On the build PC: Docker 29.6.2, Compose v5.3.1, Git 2.55.
**If `docker version` shows no "Server" section:** Docker Desktop is not running. Start it from the Start menu and wait for "Engine running".

### 1.2 Install missing pieces (only if 1.1 failed)
| Tool | Free option | How |
|---|---|---|
| WSL2 + Ubuntu | Built into Windows | **[Windows PowerShell as Administrator]** `wsl --install -d Ubuntu`, then reboot |
| Docker | Docker Desktop (free for personal/education use and small businesses) | Download from https://docs.docker.com/desktop/setup/install/windows-install/, keep "Use WSL 2" ticked |
| Docker (alternative) | Docker Engine inside Ubuntu, no Desktop app | Follow https://docs.docker.com/engine/install/ubuntu/ then `sudo usermod -aG docker $USER` |
| Git | Git for Windows | https://git-scm.com/download/win |
| VS Code | Free | https://code.visualstudio.com/ + extensions: Docker, YAML (Red Hat), WSL; optional GitLens, Live Server |

**Native Ubuntu path [Ubuntu/WSL terminal]:**
```bash
sudo apt update && sudo apt install -y git ca-certificates curl
# then install Docker Engine from Docker's official repository (link above)
docker version && docker compose version
```

### 1.3 GitHub
Create a free account at https://github.com, then a **private** repository named `tern-search` (no README; we have one). Tell Git who you are:
**[Windows PowerShell]**
```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

---

## Stage 2: Project setup

### 2.1 Put the project somewhere permanent
Recommended: `C:\Users\<you>\Projects\tern-search`. Open that folder in VS Code (**File → Open Folder**).
*(Performance tip: with Docker Engine inside WSL, keep the folder inside Ubuntu, e.g. `~/projects/tern-search`; with Docker Desktop, a Windows folder works fine.)*

### 2.2 Initialise Git
**[Windows PowerShell]**
```powershell
git init -b main
git status
```
**Verify:** `git status` lists files but **not** `.env`. If `.env` appears, `.gitignore` is missing: stop and fix that first.

How this differs from the video: the video cloned `searxng-docker`. That repository is deprecated, so this project is built from the official `searxng/searxng` `container/` template plus our own theme layer.

---

## Stage 3: Configuration

### 3.1 Create `.env` and your secret
**[Windows PowerShell]**
```powershell
Copy-Item .env.example .env
powershell -ExecutionPolicy Bypass -File .\scripts\new-secret.ps1
```
**[Ubuntu/WSL terminal]**
```bash
cp .env.example .env && sh scripts/new-secret.sh
```
**What it does:** asks the operating system's cryptographic random generator for 32 bytes, writes them as 64 hex characters into `SEARXNG_SECRET=` in `.env`, and never prints them. The secret signs SearXNG's cookies and tokens; anyone who has it could forge them.

| Variable | Meaning | Local value |
|---|---|---|
| `SEARXNG_SECRET` | Cookie/token signing key | generated |
| `BIND_ADDRESS` | Which network card listens. `127.0.0.1` = this PC only; `0.0.0.0` = your Wi-Fi too | `127.0.0.1` |
| `HOST_PORT` | Port on your PC | `8888` |
| `SEARXNG_VERSION` | Image tag | `latest` (pin e.g. `2026.11.2-cccbc9e15` for repeatable installs) |
| `SEARXNG_BASE_URL`, `TERN_HOSTNAME`, `TERN_ACME_EMAIL`, `SEARXNG_LIMITER` | Public HTTPS only | commented out |

### 3.2 `docker-compose.yml` explained
- `core`: SearXNG. Publishes `BIND_ADDRESS:HOST_PORT → 8080`. Mounts `core-config/` (settings) and the `theme/` files **read-only** (`:ro`). `SEARXNG_VALKEY_URL` connects it to Valkey.
- `valkey`: the cache. **No `ports:`**, so nothing outside Docker can reach it.
- `caddy`: only starts with `--profile public`.
- `volumes:` named volumes keep cache data and certificates across restarts.

### 3.3 `settings.yml` explained
`use_default_settings: true` means "start from SearXNG's defaults and change only what I list". Indentation is **2 spaces, never tabs**. See comments in the file for each key.

---

## Stage 4: Deployment

**[Windows PowerShell]**
```powershell
docker compose pull
docker compose up -d
docker compose ps
docker compose logs core --tail 30
```
**Expected `ps`:**
```
NAME          STATUS          PORTS
tern-core     Up …            127.0.0.1:8888->8080/tcp
tern-valkey   Up …            6379/tcp
```
**Expected log lines:** `Listening at: http://[::]:8080` and `Started worker-1`. Two lines `ahmia: can't register engine` / `torch: …` are normal (Tor-only engines; they need a Tor proxy).

**Verify the services talk to each other:**
```powershell
docker exec tern-valkey valkey-cli ping
docker exec tern-valkey valkey-cli dbsize
```
`PONG` and a number above 0 after a few searches = SearXNG is using Valkey.

---

## Stage 5: Testing the base app
1. Open http://localhost:8888 and search for `coffee`.
2. Each result shows small engine badges (e.g. `brave`, `google cse`, `duckduckgo`): proof that several engines answered.
3. Open a result, press **Back**: the results page returns instantly (GET method).
4. Click **Images**, **News**, **Videos** chips.
5. Preferences (gear icon) → change *Theme style* to Dark → **Save**. Then set it back to Auto.
6. Footer → **Engine stats** (`/stats`): response times per engine.
7. Search with SafeSearch set to *Strict* from the filter bar.
8. **API test [Windows PowerShell]:**
   ```powershell
   (Invoke-RestMethod "http://localhost:8888/search?q=linux&format=json").results.Count
   ```
   Build-time result: `38` results from `brave` and `google cse`; DuckDuckGo returned a CAPTCHA (normal from time to time).

---

## Stage 6: Functional customisation (`core-config/settings.yml`)

| Change | Edit | Apply |
|---|---|---|
| Instance name | `general: instance_name: "Tern"` | `docker compose restart core` |
| Safe search default | `search: safe_search: 0/1/2` | restart |
| Autocomplete provider | `search: autocomplete: "duckduckgo"` (or `"brave"`, `"wikipedia"`, `""` = off) | restart |
| Disable an engine | under `engines:` add `- name: google` + `disabled: true` | restart |
| API formats | `search: formats: [html, json, csv, rss]` (remove `json` to disable the API) | restart |
| Stats page | `general: enable_metrics: true` | restart |

Engine names are listed in Preferences → Engines. A wrong name shows an error in `docker compose logs core`.

---

## Stage 7: UI theme

### 7.1 How the theme plugs in (verified in the running container)
- SearXNG's templates live at `/usr/local/searxng/searx/templates/simple/`; static files at `/usr/local/searxng/searx/static/themes/simple/`.
- Tern mounts `theme/static/` at `…/static/themes/simple/tern/` and replaces 5 templates file-by-file (see `docker-compose.yml`). Everything else stays upstream.
- `base.html` loads `tokens.css`, then `tern.css`, then `tern.js`. `tern.css` first *re-maps* SearXNG's own `--color-*` variables to Tern tokens, then restyles components.

**CSS variable / design token:** a named value like `--tern-color-accent: #0f766e;`. Components say `color: var(--tern-color-accent)`, so changing one line in `tokens.css` recolours everything.

### 7.2 Edit → see the change
1. Edit `theme/static/tokens.css` (e.g. change `--tern-color-accent`).
2. **[Windows PowerShell]**
   ```powershell
   docker compose up -d --force-recreate core
   ```
   (Recreate, not just restart: SearXNG's file server indexes static files at start-up.)
3. In the browser press **Ctrl+Shift+R** (hard refresh). SearXNG lets browsers cache static files for up to 90 s.
4. Check contrast still passes: `python scripts/check-contrast.py`

### 7.3 Change the quick links
Edit `theme/templates/tern/quicklinks.html`; one line per tile: `("Label", "https://address/"),`. Recreate `core`, then hard refresh.

### 7.4 Free browser developer tools
- **Inspect** (F12 → Elements): click an element, see which rule wins. Search for `--tern-` in *Computed*.
- **Device toolbar** (Ctrl+Shift+M): test 375px (phone), 768px (tablet), 1440px (desktop).
- **Rendering panel** (⋮ → More tools → Rendering): *Emulate prefers-color-scheme: dark* and *prefers-reduced-motion: reduce*.
- **Network tab**: reload; every request's domain must be `localhost:8888`. (Build-time check: 44 requests, 0 external.)
- **Lighthouse** (F12 → Lighthouse → Accessibility + Performance + Best practices → Analyze). Record **your real scores** in `docs/06-test-plan.md`; none are filled in here.

---

## Stage 8: Maintenance and GitHub

### 8.1 Daily commands [Windows PowerShell]
```powershell
docker compose stop          # pause (keeps containers)
docker compose start         # resume
docker compose down          # remove containers (volumes and config stay)
docker compose up -d         # create and start
docker compose logs -f core  # live log, Ctrl+C to quit
```
`restart: unless-stopped` means it comes back automatically when Docker Desktop starts. Enable *Docker Desktop → Settings → General → Start Docker Desktop when you sign in* if you want it always available.

### 8.2 Safe update
```powershell
docker compose pull
powershell -ExecutionPolicy Bypass -File .\scripts\check-upstream.ps1
docker compose up -d
```
If the check prints **CHANGED** for a file: copy the new upstream version into `theme/templates/`, re-apply the lines marked `TERN`, copy it to `theme/upstream-snapshot/`, update `theme/upstream-snapshot/VERSION`. Then repeat the tests in `docs/06-test-plan.md` (at least UI-01…UI-06). To roll back, set `SEARXNG_VERSION=<previous tag>` in `.env` and `docker compose up -d`.

### 8.3 Backup and restore
```powershell
New-Item -ItemType Directory -Force backups | Out-Null
tar -czf "backups/tern-$(Get-Date -Format yyyyMMdd).tar.gz" .env core-config theme caddy docker-compose.yml
```
Restore: extract the archive into a fresh folder, then `docker compose up -d`. (`backups/` is git-ignored because it contains `.env`. Keep a copy somewhere private, e.g. an encrypted USB drive.)

### 8.4 First push to GitHub
```powershell
git add .
git status                    # confirm .env is NOT listed
git commit -m "Tern private search: SearXNG + Valkey + custom theme"
git remote add origin https://github.com/<your-username>/tern-search.git
git push -u origin main
```
Then put your repository URL in `settings.yml → brand → custom → links` (AGPL source link).

### 8.5 Branch workflow for changes
```powershell
git switch -c theme/new-accent        # 1. branch per change
# edit, recreate core, test in browser
git add theme/static/tokens.css
git commit -m "Change accent to indigo"
git push -u origin theme/new-accent   # 2. open a Pull Request on GitHub, review the diff
git switch main ; git pull            # 3. after merging on GitHub
```

---

## Using Tern on your other devices

| Option | Cost | Reach | Setup | Notes |
|---|---|---|---|---|
| **A. This PC only** (default) | Free | This PC | none | Safest |
| **B. Home Wi-Fi** | Free | Phones/laptops on the same Wi-Fi | `.env`: `BIND_ADDRESS=0.0.0.0` → `docker compose up -d`. Find your PC's IP: `ipconfig` (IPv4 Address). On the phone open `http://<that-IP>:8888`. Allow *com.docker.backend* through Windows Firewall on **Private** networks only when prompted | Plain HTTP on your LAN; never do this on public Wi-Fi. PC must be on |
| **C. Tailscale (recommended for phones)** | Free personal plan | Your devices anywhere | Install Tailscale on PC + phone, sign in to the same account. On the PC: `tailscale serve --bg 8888` (**VERIFY BEFORE USE**: https://tailscale.com/kb/1312/serve). Open the `https://<pc-name>.<tailnet>.ts.net` address it prints | Private, encrypted, real HTTPS, no open ports. Keep `BIND_ADDRESS=127.0.0.1`. Tailscale sees connection metadata, not your searches |
| **D. Cloudflare Tunnel** | Free tier | Public internet | https://developers.cloudflare.com/cloudflare-one/connectivity/cloudflared/ | Needs a domain on Cloudflare; Cloudflare terminates TLS and **can see your traffic**. Enable the limiter |
| **E. Always-free VM + Caddy** | Free tier (Oracle Cloud Always Free if your card is accepted; availability varies) | Public, always on | `[Cloud server]` install Docker, copy project, set `TERN_HOSTNAME`, `TERN_ACME_EMAIL`, `SEARXNG_BASE_URL`, `SEARXNG_LIMITER=true`, open 80/443 only, `docker compose --profile public up -d`. Free subdomain: https://www.duckdns.org | Engines see the VM's IP, not yours. You are responsible for securing a public server |

**Make Tern your browser's search engine**
- Chrome/Edge (desktop): Settings → Search engine → Manage search engines → *Site search* → **Add**: Name `Tern`, Shortcut `t`, URL `http://localhost:8888/search?q=%s` (use your LAN/Tailscale address on other devices). Then ⋮ → *Make default*.
- Firefox: open Tern, right-click the address bar → **Add "Tern"** (uses SearXNG's built-in OpenSearch file), then Settings → Search → Default.
- Phone: open Tern in the browser → menu → **Add to Home screen**. With option C (HTTPS) Chrome offers **Install app** using Tern's icon and name.
