# 6. Testing and Validation Plan

Fill in **Actual result** and **Pass/Fail** yourself. They are deliberately blank: do not copy expected results into them.
Tester: ____________ Date: ____________ SearXNG version (`docker compose exec core cat /usr/local/searxng/searx/version_frozen.py`): ____________

## Functional
| Test ID | Description | Steps | Expected result | Actual result | Pass/Fail |
|---|---|---|---|---|---|
| F-01 | Home page loads | Open `http://localhost:8888` | Tern logo, pill search bar, 8 quick-link tiles | | |
| F-02 | Basic search | Search `coffee` | Results list with titles, URLs, snippets | | |
| F-03 | Multiple engines | Look at badges under results | ≥2 different engine names | | |
| F-04 | Categories | Click Images, News, Videos | Category-specific results; selected chip highlighted | | |
| F-05 | Pagination | Click page 2 | New results, page 2 marked current | | |
| F-06 | Back button | Open a result, press Back | Results page returns, no "resubmit form" warning | | |
| F-07 | Autocomplete | Type `docker c` slowly | Suggestion list appears; arrows move; Enter searches | | |
| F-08 | Safe search | Set SafeSearch Strict in filter bar, search an adult term | Explicit results filtered | | |
| F-09 | Preferences persist | Change theme style to Dark, Save, reload | Dark theme kept | | |
| F-10 | Stats page | Footer → Engine stats | Table of engines with timings | | |
| F-11 | JSON API | `Invoke-RestMethod "http://localhost:8888/search?q=linux&format=json"` | JSON with `results` array | | |
| F-12 | Quick-link edit | Add a tile in `quicklinks.html`, recreate core | New tile visible | | |
| F-13 | Instance name | Change `instance_name`, restart | New name in title and home page | | |

## Integration
| Test ID | Description | Steps | Expected result | Actual result | Pass/Fail |
|---|---|---|---|---|---|
| I-01 | SearXNG ↔ Valkey | `docker exec tern-valkey valkey-cli ping` then `dbsize` after a search | `PONG`, dbsize > 0 | | |
| I-02 | Image proxy | Images tab → right-click an image → copy address | URL starts with `http://localhost:8888/image_proxy` | | |
| I-03 | Engine failure handling | Search repeatedly until an engine fails | Warning box lists the engine; other results still shown | | |

## Deployment
| Test ID | Description | Steps | Expected result | Actual result | Pass/Fail |
|---|---|---|---|---|---|
| D-01 | Compose valid | `docker compose config --quiet` | No output, exit 0 | | |
| D-02 | Containers healthy | `docker compose ps` | `tern-core`, `tern-valkey` Up | | |
| D-03 | Auto-restart | Restart Docker Desktop | Both containers come back | | |
| D-04 | Clean rebuild | `docker compose down` then `up -d` | Same behaviour, preferences cookie still valid | | |
| D-05 | Update check | `scripts/check-upstream.ps1` | Lists each override as unchanged/CHANGED | | |
| D-06 | Backup/restore | Backup, extract to a new folder, `up -d` (stop the old one first) | Identical instance | | |

## Basic security
| Test ID | Description | Steps | Expected result | Actual result | Pass/Fail |
|---|---|---|---|---|---|
| S-01 | Local-only binding | `docker compose ps` | `127.0.0.1:8888->8080` | | |
| S-02 | Not reachable from LAN (default) | From phone: `http://<PC-IP>:8888` | Connection fails | | |
| S-03 | Valkey not published | `Test-NetConnection localhost -Port 6379` | TcpTestSucceeded: False (unless another app uses 6379) | | |
| S-04 | Secret not committed | `git ls-files .env` | No output | | |
| S-05 | No external requests | DevTools → Network, reload home and results | Every request goes to `localhost:8888` | | |
| S-06 | Referrer | Click a result with DevTools open | Request to the site has no `Referer` header | | |

## UI / accessibility
| Test ID | Description | Steps | Expected result | Actual result | Pass/Fail |
|---|---|---|---|---|---|
| UI-01 | Keyboard only | Unplug mouse; Tab through home and results | Every control reachable in visual order | | |
| UI-02 | Focus visible | Tab through all controls | Teal 3px ring on every focused element | | |
| UI-03 | `/` shortcut | On results, click empty area, press `/` | Caret in search bar | | |
| UI-04 | Contrast | `python scripts/check-contrast.py`; DevTools colour picker on snippets | All pairs PASS (≥4.5:1 text, ≥3:1 UI) | | |
| UI-05 | Light/dark auto | Toggle Windows dark mode (theme style Auto) | Page follows the system | | |
| UI-06 | Manual theme | Preferences → Theme style Light/Dark/Black | Overrides system setting | | |
| UI-07 | Phone 375px | Device toolbar → iPhone SE/12 | No horizontal scroll; chips scroll sideways; tiles 3 per row | | |
| UI-08 | Tablet 768px | Device toolbar 768×1024 | Single centred column | | |
| UI-09 | Desktop 1440px | Full window | Results column + sidebar | | |
| UI-10 | Zoom 200% | Ctrl + + to 200% | Content reflows, nothing cut off | | |
| UI-11 | Reduced motion | Rendering panel → prefers-reduced-motion: reduce | No transitions on hover | | |
| UI-12 | Lighthouse | F12 → Lighthouse (Accessibility, Performance, Best Practices), mobile | Scores: A11y ___ Perf ___ BP ___ | | |
| UI-13 | No-results state | Search `qwzxv-no-such-thing-8812` | Neutral (not red) "Sorry! No results" card | | |
