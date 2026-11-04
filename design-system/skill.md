---
name: design-system-tern
description: Creates implementation-ready design-system guidance with tokens, component behavior, and accessibility standards for Tern, a self-hosted private search interface on SearXNG. Use when creating or updating UI rules, component specifications, theme CSS, or design-system documentation.
---

<!-- TYPEUI_SH_MANAGED_START -->

# Tern Design System

## Mission
Tern makes private search feel as fast and calm as a modern browser's new-tab page: one obvious search bar, results you can scan in seconds, and nothing loaded from anyone else's server. Every rule below serves three goals: speed (tiny CSS, almost no JavaScript), clarity (one column, clear hierarchy) and privacy (zero third-party requests).

## Brand
- Product/brand: Tern (a small, fast sea bird). Logo mark: a teal circle with a white wing stroke, inline SVG, no text inside the mark.
- Audience: the instance owner, their family and friends; students and home-lab users; beginners to keyboard power users.
- Product surface: mobile and desktop web, served by SearXNG's `simple` theme with Tern overrides.
- Identity rules: Tern must not use the names, logos, icons, colours or fonts of any other search engine or browser. Tern's accent is teal, not blue.

## Context and goals
- Design intent (one sentence): a minimal, keyboard-first, privacy-first search UI whose whole look is controlled from one token file.
- Implementation: `theme/static/tokens.css` (tokens) + `theme/static/tern.css` (components) + a few Jinja template overrides. SearXNG's own colour variables are re-mapped to Tern tokens, so upstream components inherit the theme.
- Success: Lighthouse Accessibility 100 target (user-measured), zero external network requests, CSS under 20 KB unminified.

## Style Foundations
- Visual style: minimal, airy, soft-rounded, flat with one level of elevation, teal accent used sparingly.
- Fonts: system font stack only (`--tern-font-sans`, `--tern-font-mono`). No web-font downloads. If a brand font is added later it must be self-hosted and openly licensed (for example Inter, SIL OFL 1.1).

### Typography scale
| Token | Size | Use |
|---|---|---|
| `--tern-text-xs` | 12px | engine badges, meta |
| `--tern-text-sm` | 14px | URLs, snippets, chips, buttons |
| `--tern-text-md` | 16px | body text, all inputs (prevents iOS zoom) |
| `--tern-text-lg` | 20px | result titles |
| `--tern-text-xl` | 24px | page headings |
| `--tern-text-display` | 44px | home wordmark |

Line height: `--tern-leading-tight` (1.25) for titles, `--tern-leading-normal` (1.5) for body. Weights: `--tern-weight-regular` 400, `--tern-weight-medium` 500, `--tern-weight-bold` 600.

### Colour palette (semantic tokens)
Component guidance must reference these tokens, never raw values. Values live only in `tokens.css`.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--tern-color-bg` | #ffffff | #121616 | page background |
| `--tern-color-surface` | #f4f7f7 | #1a2020 | tiles, chips, header |
| `--tern-color-surface-raised` | #ffffff | #212929 | search bar, dropdowns |
| `--tern-color-surface-hover` | #e9efef | #2a3434 | hover fill |
| `--tern-color-border` | #dde4e4 | #2e3939 | dividers (decorative) |
| `--tern-color-border-strong` | #859191 | #6f7d7d | input outlines (≥3:1) |
| `--tern-color-text` | #1a2323 | #e6ecec | primary text |
| `--tern-color-text-muted` | #4d5b5b | #a7b4b4 | secondary text |
| `--tern-color-accent` | #0f766e | #4fd1c5 | primary actions, selected chip |
| `--tern-color-accent-soft` | #ddf2ef | #163835 | selected chip fill |
| `--tern-color-on-accent` | #ffffff | #062a27 | text on accent |
| `--tern-color-link` | #0d625b | #7fd8cd | result titles |
| `--tern-color-link-visited` | #6b3fa0 | #c7aaf2 | visited titles |
| `--tern-color-url` | #3c6b4f | #9fcfae | result URL line |
| `--tern-color-focus` | #0f766e | #4fd1c5 | focus ring |
| `--tern-color-danger` / `-soft` | #b42318 / #fdeceb | #ff8f85 / #3b1d1b | errors |
| `--tern-color-warning` / `-soft` | #855500 / #fff3d6 | #f2c46b / #3a2e14 | engine warnings |
| `--tern-color-success` / `-soft` | #1a7f37 / #e4f6e8 | #7ee2a0 / #173323 | confirmations |

Themes: `theme-auto` follows `prefers-color-scheme`; `theme-light`, `theme-dark`, `theme-black` (OLED, darker bg) are chosen in Preferences → Theme style.

### Spacing scale (4px base)
`--tern-space-1` 4px · `-2` 8px · `-3` 12px · `-4` 16px · `-5` 24px · `-6` 32px · `-7` 48px · `-8` 64px. Layout gaps must use these tokens only.

### Radius, shadow, size, motion
- Radius: `--tern-radius-sm` 6px (badges), `-md` 12px (cards, dialogs), `-lg` 16px (tiles), `-pill` 999px (search bar, chips, buttons).
- Shadow: `--tern-shadow-1` (resting raised surface), `--tern-shadow-2` (hover/focus on the search bar, open dropdowns). No other elevations.
- Size: `--tern-size-touch` 44px minimum target; `--tern-size-search-home` 52px; `--tern-size-search-header` 44px; `--tern-width-content` 688px; `--tern-width-search-home` 576px.
- Motion: `--tern-duration-fast` 120ms (colour, shadow), `--tern-duration-base` 180ms (dropdowns), `--tern-ease`. Under `prefers-reduced-motion: reduce` both durations must be 0ms. Animation must never be the only signal of a state change.

## Accessibility
- Target: WCAG 2.2 AA. All rules here are testable.
- Text contrast must be ≥4.5:1 (body, links, chips) and ≥3:1 for text ≥24px or ≥18.66px bold.
- Non-text contrast must be ≥3:1 for input boundaries, focus rings and selected-state indicators (WCAG 1.4.11).
- Focus: every interactive element must show a `--tern-focus-width` (3px) outline in `--tern-color-focus` with `--tern-focus-offset` (2px) on `:focus-visible`. `outline: none` without a replacement is prohibited.
- Keyboard: every action must work without a pointer. Tab order must follow visual order: search bar → search button → category chips → results → pagination → footer. `/` must focus the search bar when focus is not in a text field. Enter submits. Up/Down move through autocomplete suggestions (provided by SearXNG), Escape closes them.
- Targets: interactive targets must be ≥24×24px (WCAG 2.5.8); they should be ≥44×44px on touch layouts.
- Zoom and reflow: layout must work at 320px width and 200% zoom with no horizontal page scroll (WCAG 1.4.10).
- Meaning: the selected category must be indicated by more than colour (weight + underline bar). Icons that act as buttons must have an `aria-label`.
- Language: `<html lang>` must stay set by SearXNG; Tern must not remove landmarks (`role="search"`, `main`, `nav`).

## Writing Tone
concise, confident, implementation-focused. Interface copy is plain and short: "Search", "Quick links", "No results for this search". Prefer verbs on buttons. Never blame the user.

| Do | Don't |
|---|---|
| "No results. Try fewer words or another category." | "Oops! Something went wrong :(" |
| "Search" (button label) | "Go", "Submit", an unlabeled icon |
| "Quick links" (section label) | "Favorites!!!" |

## Rules: Do
- Use semantic tokens, not raw hex values in component guidance or `tern.css`.
- Define all required states: default, hover, focus-visible, active, disabled, loading, error.
- Specify responsive behavior and edge-case handling (long titles, long URLs, empty snippets, RTL).
- Self-host every asset; load CSS and JS only from `/static/`.
- Re-map SearXNG's `--color-*` variables to Tern tokens before writing new selectors.
- Keep overrides small so upstream SearXNG updates keep working.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.
- Do not load fonts, icons, scripts, images or analytics from any third-party host.
- Do not use inline `<script>` (it breaks a strict Content-Security-Policy).
- Do not copy another product's logo, wordmark, colours or proprietary fonts.
- Do not hide information in hover-only UI; touch users have no hover.

## Guideline Authoring Workflow
1. Restate design intent in one sentence (see Context and goals).
2. Define foundations and tokens in `tokens.css` first.
3. Define component anatomy, variants and interactions in this file.
4. Add accessibility acceptance criteria per component.
5. Add anti-patterns and migration notes.
6. End with the QA checklist and run it.

## Required Output Structure
- Context and goals
- Design tokens and foundations
- Component-level rules (anatomy, variants, states, responsive behavior)
- Accessibility requirements and testable acceptance criteria
- Content and tone standards with examples
- Anti-patterns and prohibited implementations
- QA checklist

## Component Rules

Shared state rules (apply to every component unless overridden):
- hover: background `--tern-color-surface-hover` or shadow `--tern-shadow-2`, transition `--tern-duration-fast`.
- focus-visible: 3px `--tern-color-focus` ring, 2px offset.
- active: background one step darker (`--tern-color-surface-hover`) and no shadow.
- disabled: opacity 0.5, `cursor: not-allowed`, no hover change, `aria-disabled="true"` when not a native control.
- loading: SearXNG reloads the page on search, so the loading state is the browser's own; components must not show fake spinners.
- error: `--tern-color-danger` text/border with `--tern-color-danger-soft` fill, plus an icon or text label (never colour alone).

### 1. Search bar (`.search_box`, input `#q`)
- Anatomy: pill container → search input → clear button (×) → search button (magnifier). Autocomplete list drops below.
- Variants: `home` (height `--tern-size-search-home`, max width `--tern-width-search-home`, centred) and `header` (height `--tern-size-search-header`, fills header column).
- Default: `--tern-color-surface-raised` fill, 1px `--tern-color-border-strong` outline, `--tern-radius-pill`, `--tern-shadow-1`.
- Hover: `--tern-shadow-2`. Focus-within: `--tern-shadow-2` + border `--tern-color-accent`; the input's own ring is replaced by the container ring (`:focus-within` must show a visible 3:1 indicator).
- Disabled: not used. Error: SearXNG shows errors in a dialog above the bar; the bar itself does not change.
- Text: `--tern-text-md`, padding-inline `--tern-space-5`. Long queries scroll inside the input; the bar must never grow taller.
- Keyboard: `/` focuses, Enter submits, Escape clears autocomplete, Up/Down select suggestions.
- Touch: whole bar height is the target; clear and search buttons are ≥44px wide.

### 2. Search button (`#send_search`) and clear button (`#clear_search`)
- Anatomy: icon-only circular button inside the bar, with `aria-label` ("search", "clear").
- Default: transparent, icon `--tern-color-text-muted`. Hover: `--tern-color-surface-hover` circle, icon `--tern-color-accent`. Active: icon `--tern-color-accent-hover`. Focus-visible: ring. Disabled: n/a.
- Without JavaScript the theme shows the word "search"; it must stay readable.

### 3. Category chips (`#categories .category`)
- Anatomy: horizontal row of chips (icon + label) under the header search bar.
- Default: transparent, text `--tern-color-text-muted`, `--tern-text-sm`, `--tern-radius-pill`, padding `--tern-space-2` × `--tern-space-3`.
- Hover: `--tern-color-surface-hover`. Selected: `--tern-color-accent-soft` fill, `--tern-color-accent` text, `--tern-weight-bold` (more than colour). Focus-visible: ring. Active: `--tern-color-surface-hover`.
- Overflow: the row must scroll horizontally on narrow screens, never wrap into many lines or overflow the page.
- Keyboard: chips are buttons in tab order; Enter/Space activates.

### 4. Result item (`#urls article.result`)
- Anatomy: favicon (optional) → URL line → title (h3 link) → meta (date, author) → snippet → engine badges.
- Spacing: `--tern-space-5` between results, no cards on desktop; a subtle `--tern-color-border` divider is allowed.
- Title: `--tern-text-lg`, `--tern-color-link`, visited `--tern-color-link-visited`, underline on hover and focus.
- URL: `--tern-text-sm`, `--tern-color-url`, single line with ellipsis; full URL must stay in the `href`.
- Snippet: `--tern-text-sm`, `--tern-color-text-muted`, leading normal; highlighted words use `--tern-color-highlight` + bold.
- Empty snippet: SearXNG prints "This site did not provide any description." in muted italic.
- Long content: titles wrap (max 2–3 lines natural), words break with `overflow-wrap: anywhere`.
- Engine badges: `--tern-text-xs`, `--tern-color-text-muted`, `--tern-radius-sm`.

### 5. Quick-link tile (`.tern-tile`)
- Anatomy: square tile → letter avatar (first letter, `--tern-color-accent-soft` circle) → label (1 line, ellipsis).
- Size: `--tern-size-tile`; grid of up to 4 columns desktop, 4 on tablet, 3 on phone.
- Default: transparent, `--tern-radius-lg`. Hover: `--tern-color-surface-hover`. Focus-visible: ring. Active: `--tern-color-surface`.
- Edit: tiles are defined in `theme/templates/tern/quicklinks.html` only. Tiles must use letter avatars, never remote favicons (that would leak your visits).
- Empty list: the whole section is not rendered.

### 6. Pagination (`#pagination`)
- Anatomy: Previous button, page numbers, Next button.
- Buttons: pill, ≥44px tall, `--tern-color-surface` fill; current page `--tern-color-accent` fill + `--tern-color-on-accent` text + `aria-current` (provided by SearXNG where available).
- Hover/active/focus as shared rules. Disabled (first page "Previous") is not rendered by SearXNG.

### 7. Preferences page controls (`/preferences`)
- Tabs: same visual rules as category chips; the selected tab must be marked by fill + weight.
- Selects and inputs: height ≥ `--tern-size-touch`, `--tern-radius-sm`, 1px `--tern-color-border-strong`, `--tern-text-md`.
- On/off switches: use SearXNG's checkbox switch re-coloured via tokens; on = `--tern-color-accent`.
- Save button: primary pill, `--tern-color-accent` fill, `--tern-color-on-accent` text; hover `--tern-color-accent-hover`.
- Engine tables: rows separated by `--tern-color-border`; must scroll horizontally on phones instead of overflowing.

### 8. Empty state (home with no quick links)
- Logo, name and search bar only. No placeholder art.

### 9. No-results state (`.dialog-error-block` inside `#urls`)
- `--tern-color-surface` fill, `--tern-radius-md`, `--tern-space-5` padding, text `--tern-color-text`. Suggests actions as a list. Must not be styled as a red error: no results is not a failure.

### 10. Error state (`.dialog-error`, engine warnings)
- `.dialog-error`: `--tern-color-danger-soft` fill, `--tern-color-danger` 1px border and heading, close button ≥24px with `aria-label`.
- Engine timeouts/CAPTCHAs (`#engines_msg`): `--tern-color-warning-soft` fill, `--tern-color-warning` text label.

### Responsive behaviour
| Width | Layout |
|---|---|
| < 600px (phone) | header search bar full width, chips scroll horizontally, results full width with `--tern-space-4` gutters, sidebar below results, tiles 3 columns |
| 600–1199px (tablet) | single column centred to `--tern-width-content`, sidebar below results |
| ≥ 1200px (desktop) | result column `--tern-width-content`, sidebar (infobox, suggestions) to the right |

## Accessibility acceptance criteria (testable)
1. Tab from page load: first stop is the search bar (or skip-able nav), focus ring visible on every stop.
2. Press `/` on the results page with focus on the body: caret lands in `#q`.
3. With mouse unplugged, complete: search → switch to Images → open page 2 → open Preferences → change theme → save.
4. Every text/background token pair in the palette table passes 4.5:1 (checked with `scripts/check-contrast.py` or DevTools).
5. At 320px width and at 200% zoom, no horizontal scrollbar on `/`, `/search`, `/preferences`.
6. With OS dark mode on and theme "auto", the page renders with dark tokens; switching to "light" in Preferences overrides it.
7. With reduced motion enabled, no transitions run (computed `transition-duration` is 0s).
8. DevTools Network tab shows requests to the instance's own host only.

## Anti-patterns and prohibited implementations
- Loading Google Fonts, icon CDNs, analytics or remote favicons (privacy leak; also blocked by CSP).
- `outline: none` on focus without a visible replacement.
- Hard-coding colours inside `tern.css` instead of tokens.
- Copying the entire SearXNG template folder: it breaks on every upstream update. Override the minimum.
- Infinite-scroll-only results with no pagination (keyboard and screen-reader trap).
- Placeholder text as the only label for the search field (SearXNG provides `aria` via the form `role="search"`; keep placeholder short).
- Animating layout (width/height) on hover.

## Migration notes
- After a SearXNG update, diff the upstream `base.html` and `index.html` against Tern's overrides (`scripts/check-upstream.ps1` / `.sh`) and re-apply Tern's few added lines.
- If SearXNG renames a `--color-*` variable, update the bridge block at the top of `tern.css`; components keep working.

## QA checklist
- [ ] Frontmatter valid; this file under 500 lines.
- [ ] `tern.css` contains no raw colour values outside the bridge comments.
- [ ] Light, dark, black and auto themes checked on `/`, `/search`, `/preferences`, `/stats`.
- [ ] Focus ring visible on search bar, buttons, chips, results, tiles, pagination, preference controls.
- [ ] `/` focuses search; Enter searches; arrows navigate autocomplete.
- [ ] Phone (375px), tablet (768px), desktop (1440px) checked in DevTools device toolbar.
- [ ] Reduced motion honoured.
- [ ] Network tab: zero third-party requests.
- [ ] Lighthouse Accessibility and Performance run; real scores recorded in `docs/06-test-plan.md`.
- [ ] No-results, engine-error and preferences pages styled with tokens.

<!-- TYPEUI_SH_MANAGED_END -->
