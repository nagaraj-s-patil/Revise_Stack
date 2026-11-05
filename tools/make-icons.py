"""Builds every icon and logo file from the supplied logo (assets/brand/logo-source.png).

Run: python3 tools/make-icons.py        (needs Pillow: pip install pillow)

Outputs:
  assets/icons/icon-192.png, icon-512.png   rounded-square app icons ("any" purpose)
  assets/icons/icon-maskable-512.png        full-bleed icon with a safe zone, for Android adaptive icons
  assets/icons/apple-touch-icon.png         180x180, iPhone home screen
  assets/icons/favicon-32.png, favicon-16.png
  assets/icons/mark-96.png                  small mark shown in the sidebar, top bar and sign-in screen
  assets/brand/revise-stack-logo.png        the full logo (cap, book and name), cropped, white background
  favicon.ico                               16, 32 and 48 px
The icons use only the cap, book and check mark, because the name is unreadable at phone-icon sizes.
The logo has a white background, so every icon is a white tile with the mark on it.
"""
import os
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'brand', 'logo-source.png')
WHITE = (255, 255, 255)
MARK_BOX = (323, 84, 1174, 573)    # cap, book and check, measured in the 1536x1024 source
FULL_BOX = (103, 84, 1445, 860)    # mark, name and tagline
PAD = 14

def whiten(img):
    """The source background is off-white with faint noise. Push near-white to pure white so no box shows on a white tile."""
    a = np.asarray(img).astype(float)
    t = np.clip((a.min(axis=2) - 226) / 22.0, 0, 1)[..., None]
    return Image.fromarray((a * (1 - t) + 255 * t).round().astype('uint8'))


src = whiten(Image.open(SRC).convert('RGB'))
MARK = src.crop((MARK_BOX[0] - PAD, MARK_BOX[1] - PAD, MARK_BOX[2] + PAD, MARK_BOX[3] + PAD))


def rounded_mask(n, radius_ratio):
    big = n * 4
    m = Image.new('L', (big, big), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, big - 1, big - 1), radius=int(big * radius_ratio), fill=255)
    return m.resize((n, n), Image.LANCZOS)


def icon(n, mark_width_ratio, rounded):
    canvas = Image.new('RGBA', (n, n), WHITE + (255,))
    w = int(n * mark_width_ratio)
    h = int(MARK.height * w / MARK.width)
    canvas.alpha_composite(MARK.resize((w, h), Image.LANCZOS).convert('RGBA'), ((n - w) // 2, (n - h) // 2))
    if rounded:
        canvas.putalpha(rounded_mask(n, 0.22))
    return canvas


def save(img, *parts):
    path = os.path.join(ROOT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)
    print('wrote', os.path.relpath(path, ROOT), img.size)


save(icon(512, 0.74, True), 'assets', 'icons', 'icon-512.png')
save(icon(192, 0.74, True), 'assets', 'icons', 'icon-192.png')
# maskable: full bleed, mark inside the central safe zone (Android crops to a circle, squircle or square)
save(icon(512, 0.58, False), 'assets', 'icons', 'icon-maskable-512.png')
save(icon(180, 0.72, False).convert('RGB'), 'assets', 'icons', 'apple-touch-icon.png')
save(icon(32, 0.88, True), 'assets', 'icons', 'favicon-32.png')
save(icon(16, 0.92, True), 'assets', 'icons', 'favicon-16.png')
save(icon(96, 0.9, True), 'assets', 'icons', 'mark-96.png')

icon(256, 0.88, True).save(os.path.join(ROOT, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
print('wrote favicon.ico')

# full logo, cropped with a little white margin
m = 40
full = src.crop((FULL_BOX[0] - m, FULL_BOX[1] - m, FULL_BOX[2] + m, FULL_BOX[3] + m))
save(full, 'assets', 'brand', 'revise-stack-logo.png')
