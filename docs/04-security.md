# 4. Security and Privacy

**Short version:** Tern stops search companies from building a profile of *you* through your browser. It does **not** make you anonymous. Whoever runs the server (you) and the network it uses can still see what is searched.

## 4.1 How SearXNG reduces tracking
| Normal search | With Tern |
|---|---|
| Your browser talks to Google/Bing directly, sending cookies, browser fingerprint, history-linked account | Your browser talks only to your server. The server talks to engines **without your cookies** and with a generic browser identity |
| Every search joins one long profile | Each upstream request is independent, so there's no account and no history to join it to |
| Ads and tracking links in results | No ads. Result links go straight to the site; `Referrer-Policy: no-referrer` stops the site learning what you searched |
| Images load from third-party servers (they see your IP) | `image_proxy: true`: images are fetched by your server |
| Search page loads fonts, scripts, analytics from other domains | Tern loads **zero** external resources (checked in the Network tab: 44 requests, all `localhost`) |

## 4.2 What external engines still see
- The **search words** (they must, to answer).
- The **IP address of the machine running SearXNG**. At home that is *your home IP*, the same one your normal searches come from (the video says this too). On a cloud VM it's the VM's IP.
- Timing patterns. A one-person instance makes your queries easy to group together by IP, even without cookies.
- **Autocomplete:** every keystroke batch is sent by your server to the provider (`duckduckgo` by default). Set `autocomplete: ""` if you don't want that.

## 4.3 IP addresses and logs
- SearXNG does not write queries to disk. Container logs show errors and engine problems, not search terms (default log level).
- Your own browser history still stores result URLs (`query_in_title: false` keeps queries out of page titles).
- Your ISP sees that you contact your server (and, from a home instance, the engines over HTTPS). It cannot read the HTTPS contents.
- Valkey stores only counters and short-lived cache data in its Docker volume.

## 4.4 Local vs cloud hosting
| | Home PC | Cloud VM |
|---|---|---|
| Who controls the hardware | You | Provider (they could inspect it) |
| IP engines see | Your home IP | VM IP (not tied to your address) |
| Exposure | None by default (`127.0.0.1`) | Public: bots, scanners, abuse |
| Availability | Only when your PC is on | 24/7 |

## 4.5 HTTPS and certificates
Local `http://localhost` is fine: the traffic never leaves your PC. Anything beyond your PC should use HTTPS: Tailscale (`tailscale serve`) or Caddy, which obtains and renews free Let's Encrypt certificates automatically (it needs a domain pointing at the server and ports 80/443 open). Never type passwords into an HTTP page on a network you don't trust.

## 4.6 Firewall
- **Windows:** with `BIND_ADDRESS=127.0.0.1` nothing is reachable from outside. If you choose LAN mode, allow Docker on **Private** networks only, never Public.
- **Cloud server (ufw):**
  ```bash
  # [Cloud server]
  sudo ufw default deny incoming
  sudo ufw allow OpenSSH
  sudo ufw allow 80,443/tcp
  sudo ufw allow 443/udp
  sudo ufw enable
  ```
  Note: Docker-published ports can bypass ufw rules. That's why Tern publishes only what is needed and keeps Valkey unpublished.

## 4.7 Admin access, secrets, Docker network
- SearXNG has no admin login; administration means editing files on the server. Protect SSH with keys (`PasswordAuthentication no`).
- `SEARXNG_SECRET` lives only in `.env` (git-ignored, `chmod 600` on Linux). If it leaks, run the new-secret script and recreate `core`.
- **Never publish internal ports.** Valkey has no `ports:` and no password; it must stay on the private Docker network.
- Theme and template mounts are read-only (`:ro`), so a bug in SearXNG cannot rewrite your theme files.

## 4.8 Why the theme must not load third-party assets
Every font, icon, script or image loaded from another domain tells that domain your IP, the page you're on and when. A Google-hosted font would undo the point of the project. Tern uses system fonts, inline SVG icons and letter avatars (not remote favicons). The Caddy config adds a **Content-Security-Policy** (`default-src 'none'; script-src 'self'; …`) so the browser itself refuses anything external, even if a future edit adds it by mistake. That is also why `tern.js` is a file and not an inline `<script>`.

## 4.9 Public instance checklist
`SEARXNG_LIMITER=true` · `limiter.toml` with `link_token = true` · consider removing `json` from `formats` (bots abuse APIs) · HTTPS only · OS updates (`sudo apt upgrade`) · `docker compose pull` monthly · follow the AGPL: link your modified source.

## 4.10 Limitations and your responsibilities
Not anonymous; not a VPN; not Tor. Engines may block or CAPTCHA your IP. As administrator you can technically see traffic to your server. If friends use it, tell them honestly what you could see, keep logs minimal, and keep the software updated.
