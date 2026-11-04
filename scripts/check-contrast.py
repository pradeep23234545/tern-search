"""Check WCAG 2.2 contrast of Tern's colour tokens (light and dark).

Run from the project root:  python scripts/check-contrast.py
Reads theme/static/tokens.css, so it stays correct when you change colours.
Exit code 1 if any pair fails.
"""

import re
import sys
from pathlib import Path

TOKENS = Path(__file__).resolve().parent.parent / "theme" / "static" / "tokens.css"

# (foreground, background, minimum ratio, why)
PAIRS = [
    ("text", "bg", 4.5, "body text"),
    ("text", "surface", 4.5, "text on tiles/chips"),
    ("text-muted", "bg", 4.5, "snippets, secondary text"),
    ("text-muted", "surface", 4.5, "muted text on surfaces"),
    ("text-muted", "surface-hover", 4.5, "muted text on hover"),
    ("link", "bg", 4.5, "result titles"),
    ("link-visited", "bg", 4.5, "visited titles"),
    ("url", "bg", 4.5, "result URL line"),
    ("accent", "bg", 4.5, "accent text"),
    ("accent", "accent-soft", 4.5, "selected chip, tile letter"),
    ("on-accent", "accent", 4.5, "button text"),
    ("danger", "danger-soft", 4.5, "error text"),
    ("warning", "warning-soft", 4.5, "warning text"),
    ("border-strong", "bg", 3.0, "input outline (non-text)"),
    ("border-strong", "surface-raised", 3.0, "search bar outline (non-text)"),
    ("focus", "bg", 3.0, "focus ring (non-text)"),
]


def blocks(css):
    """Return {'light': {...}, 'dark': {...}} token dictionaries."""
    light = dict(re.findall(r"--tern-color-([\w-]+):\s*(#[0-9a-fA-F]{6})", css.split(":root.theme-dark")[0]))
    dark_block = re.search(r":root\.theme-dark,\s*:root\.theme-black\s*\{(.*?)\}", css, re.S).group(1)
    dark = dict(light)
    dark.update(re.findall(r"--tern-color-([\w-]+):\s*(#[0-9a-fA-F]{6})", dark_block))
    return {"light": light, "dark": dark}


def luminance(hex_colour):
    channels = [int(hex_colour[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def ratio(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def main():
    failed = 0
    for mode, tokens in blocks(TOKENS.read_text(encoding="utf-8")).items():
        print(f"\n{mode.upper()}")
        for fg, bg, minimum, why in PAIRS:
            r = ratio(tokens[fg], tokens[bg])
            ok = r >= minimum
            failed += not ok
            print(f"  {'PASS' if ok else 'FAIL'}  {r:5.2f}:1 (need {minimum})  {fg} on {bg}  - {why}")
    print("\nAll pairs pass." if not failed else f"\n{failed} pair(s) FAIL.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
