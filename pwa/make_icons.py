"""Draw the app icons (a soil column) into pwa/icons/. Run: python pwa/make_icons.py   (needs Pillow)."""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "icons")
os.makedirs(OUT, exist_ok=True)
GREEN = (44, 107, 90)
BANDS = [(92, 64, 40), (120, 98, 72), (176, 152, 112), (140, 130, 100)]   # topsoil, subsoil, parent material (schematic)


def draw(size, safe=1.0):
    """safe < 1 shrinks the drawing (maskable icons keep the content inside the central safe zone)."""
    S = 1024
    im = Image.new("RGB", (S, S), GREEN)
    d = ImageDraw.Draw(im)
    k = safe
    cx, cy = S / 2, S / 2
    w, h, dx, dy = 360 * k, 560 * k, 110 * k, 70 * k
    x0, y0 = cx - (w + dx) / 2, cy - (h + dy) / 2 + dy      # front face top-left
    hts = [0.22, 0.26, 0.28, 0.24]
    y = y0
    for (r, g, b), f in zip(BANDS, hts):
        bh = h * f
        d.rectangle([x0, y, x0 + w, y + bh], fill=(r, g, b))
        d.polygon([(x0 + w, y), (x0 + w + dx, y - dy), (x0 + w + dx, y + bh - dy), (x0 + w, y + bh)], fill=(int(r * .72), int(g * .72), int(b * .72)))
        y += bh
    top = [(x0, y0), (x0 + dx, y0 - dy), (x0 + w + dx, y0 - dy), (x0 + w, y0)]
    d.polygon(top, fill=(130, 96, 62))
    d.rectangle([x0, y0, x0 + w, y0 + h], outline=(20, 30, 25), width=int(6 * k))
    return im.resize((size, size), Image.LANCZOS)


draw(512).save(os.path.join(OUT, "icon-512.png"))
draw(192).save(os.path.join(OUT, "icon-192.png"))
draw(512, safe=0.72).save(os.path.join(OUT, "icon-maskable-512.png"))
draw(180).save(os.path.join(OUT, "apple-touch-icon.png"))
draw(32).save(os.path.join(OUT, "favicon-32.png"))
print("icons written to", OUT, sorted(os.listdir(OUT)))
