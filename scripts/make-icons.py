"""Draw Tern's PNG app icons (192px, 512px, 180px apple-touch) from the logo geometry.

Run from the project root:  python scripts/make-icons.py
Needs Pillow (free):         python -m pip install pillow
The shapes match theme/static/favicon.svg (64x64 viewBox).
"""

from pathlib import Path

from PIL import Image, ImageDraw

ACCENT = (15, 118, 110)  # --tern-color-accent (light)
WING = (255, 255, 255)
OUT = Path(__file__).resolve().parent.parent / "theme" / "static"

# Wing outline from the SVG: M10 31 Q21 19 32 30 Q43 19 54 31 Q43 25 32 40 Q21 25 10 31 Z
WING_PATH = [
    ((10, 31), (21, 19), (32, 30)),
    ((32, 30), (43, 19), (54, 31)),
    ((54, 31), (43, 25), (32, 40)),
    ((32, 40), (21, 25), (10, 31)),
]


def quad(p0, p1, p2, steps=24):
    """Sample a quadratic Bezier curve into points."""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t**2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t**2 * p2[1]
        pts.append((x, y))
    return pts


def draw_icon(size, full_bleed=False):
    scale = 4  # draw large, then shrink for smooth edges
    big = size * scale
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    unit = big / 64
    if full_bleed:
        d.rectangle([0, 0, big, big], fill=ACCENT)
    else:
        d.ellipse([2 * unit, 2 * unit, 62 * unit, 62 * unit], fill=ACCENT)
    pts = []
    for seg in WING_PATH:
        pts.extend(quad(*seg))
    d.polygon([(x * unit, y * unit) for x, y in pts], fill=WING)
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    draw_icon(192).save(OUT / "icon-192.png")
    draw_icon(512).save(OUT / "icon-512.png")
    draw_icon(180, full_bleed=True).save(OUT / "apple-touch-icon.png")
    print("Wrote icon-192.png, icon-512.png, apple-touch-icon.png to", OUT)
