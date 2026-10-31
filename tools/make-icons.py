"""Builds every icon and logo file from the supplied logo (assets/brand/logo-source.png).

Run: python3 tools/make-icons.py        (needs Pillow: pip install pillow)

Outputs:
  assets/icons/icon-192.png, icon-512.png   rounded-square app icons ("any" purpose)
  assets/icons/icon-maskable-512.png        full-bleed icon with a safe zone, for Android adaptive icons
  assets/icons/apple-touch-icon.png         180x180, iPhone home screen
  assets/icons/favicon-32.png, favicon-16.png
  assets/icons/mark-96.png                  small mark shown in the page header
  assets/brand/revise-stack-logo.png        the full logo (books and name) as a circle, transparent corners
  favicon.ico                               16, 32 and 48 px
The icons use only the books-and-check mark, because the name is unreadable at phone-icon sizes.
"""
import os
import sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'brand', 'logo-source.png')
NAVY = (13, 25, 50)          # background colour sampled from the logo
MARK_BOX = (354, 245, 985, 760)   # books and check mark, measured in the 1254x1254 source
CIRCLE_CENTER, CIRCLE_RADIUS = (626, 623), 546
PAD = 10

src = Image.open(SRC).convert('RGB')


def mark_layer():
    """The mark with its navy background turned transparent, so it can sit on a clean navy canvas."""
    x0, y0, x1, y1 = MARK_BOX
    crop = src.crop((x0 - PAD, y0 - PAD, x1 + PAD, y1 + PAD))
    px = crop.load()
    alpha = Image.new('L', crop.size)
    ap = alpha.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b = px[x, y]
            d = abs(r - NAVY[0]) + abs(g - NAVY[1]) + abs(b - NAVY[2])
            ap[x, y] = max(0, min(255, int((d - 6) * 255 / 24)))
    out = crop.convert('RGBA')
    out.putalpha(alpha)
    return out


MARK = mark_layer()


def rounded_mask(n, radius_ratio):
    big = n * 4
    m = Image.new('L', (big, big), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, big - 1, big - 1), radius=int(big * radius_ratio), fill=255)
    return m.resize((n, n), Image.LANCZOS)


def icon(n, mark_width_ratio, rounded):
    canvas = Image.new('RGBA', (n, n), NAVY + (255,))
    w = int(n * mark_width_ratio)
    h = int(MARK.height * w / MARK.width)
    mark = MARK.resize((w, h), Image.LANCZOS)
    canvas.alpha_composite(mark, ((n - w) // 2, (n - h) // 2))
    if rounded:
        canvas.putalpha(rounded_mask(n, 0.22))
    return canvas


def save(img, *parts):
    path = os.path.join(ROOT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)
    print('wrote', os.path.relpath(path, ROOT), img.size)


# "any" icons: rounded square, mark fills about 68% of the width
save(icon(512, 0.68, True), 'assets', 'icons', 'icon-512.png')
save(icon(192, 0.68, True), 'assets', 'icons', 'icon-192.png')
# maskable: full bleed, mark inside the central 80% circle (Android crops to a circle, squircle or square)
save(icon(512, 0.56, False), 'assets', 'icons', 'icon-maskable-512.png')
# iPhone: full bleed square, iOS rounds the corners itself
save(icon(180, 0.66, False).convert('RGB'), 'assets', 'icons', 'apple-touch-icon.png')
# small sizes: bigger mark so it stays readable
save(icon(32, 0.82, True), 'assets', 'icons', 'favicon-32.png')
save(icon(16, 0.86, True), 'assets', 'icons', 'favicon-16.png')
save(icon(96, 0.70, True), 'assets', 'icons', 'mark-96.png')

ico_base = icon(256, 0.82, True)
ico_base.save(os.path.join(ROOT, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
print('wrote favicon.ico')

# full logo as a circle with transparent corners
cx, cy = CIRCLE_CENTER
r = CIRCLE_RADIUS
box = (cx - r - 6, cy - r - 6, cx + r + 6, cy + r + 6)
logo = src.crop(box).convert('RGBA')
n = logo.width
big = Image.new('L', (n * 4, n * 4), 0)
ImageDraw.Draw(big).ellipse((6 * 4, 6 * 4, (n - 6) * 4, (n - 6) * 4), fill=255)
logo.putalpha(big.resize((n, n), Image.LANCZOS))
logo = logo.resize((1024, 1024), Image.LANCZOS)
save(logo, 'assets', 'brand', 'revise-stack-logo.png')
