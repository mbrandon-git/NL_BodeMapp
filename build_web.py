"""Builds docs/, the folder GitHub Pages serves: the installable web app.
Usage: python build_web.py        (run `python pwa/make_icons.py` once first, and build tiles/soil.pmtiles for the map)
docs/ = index.html (page, data and app code inlined) + vendor/ (MapLibre GL JS, pmtiles) + icons/ + manifest.webmanifest + sw.js
        + data/soil.pmtiles (map tiles) + .nojekyll
All paths are relative, so the folder works under https://<user>.github.io/<repo>/ and at the root of any host."""
import os, re, shutil, hashlib, subprocess, sys
from build import ROOT, inline_scripts, CLOSE

DOCS = os.path.join(ROOT, "docs")
subprocess.run([sys.executable, os.path.join(ROOT, "shared", "build_translations.py")], check=True)

raw = open(os.path.join(ROOT, "mobile", "index.html"), encoding="utf-8").read()
# the map libraries stay as separate files (cached by the service worker); everything else is inlined
raw = raw.replace('<script src="map.js"></script>', '<script src="vendor/maplibre-gl.js"></script>\n<script src="vendor/pmtiles.js"></script>\n<script src="map.js"></script>')
def inline(m):
    if m.group(1).startswith("vendor/"):
        return m.group(0)
    return inline_scripts(m.group(0), "mobile")
html = re.sub(r'<script src="([^"]+)"></script>', inline, raw)

HEAD = '''<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="theme-color" content="#2c6b5a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="BodeMapp">
<link rel="stylesheet" href="vendor/maplibre-gl.css">
<style>:root{padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)}</style>
'''
html = html.replace("<title>NL BodeMapp</title>", "<title>NL BodeMapp</title>\n" + HEAD, 1)
REG = '<script>if("serviceWorker" in navigator){addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})})}' + CLOSE + "\n"
html = html.replace("</body>", REG + "</body>", 1)

if os.path.isdir(DOCS):
    shutil.rmtree(DOCS)
os.makedirs(os.path.join(DOCS, "vendor"))
os.makedirs(os.path.join(DOCS, "icons"))
os.makedirs(os.path.join(DOCS, "data"))
open(os.path.join(DOCS, "index.html"), "w", encoding="utf-8").write(html)
for f in os.listdir(os.path.join(ROOT, "vendor")):
    shutil.copy(os.path.join(ROOT, "vendor", f), os.path.join(DOCS, "vendor", f))
icons = os.path.join(ROOT, "pwa", "icons")
for f in os.listdir(icons):
    shutil.copy(os.path.join(icons, f), os.path.join(DOCS, "icons", f))
shutil.copy(os.path.join(ROOT, "pwa", "manifest.webmanifest"), os.path.join(DOCS, "manifest.webmanifest"))
tiles = os.path.join(ROOT, "tiles", "soil.pmtiles")
if os.path.exists(tiles):
    shutil.copy(tiles, os.path.join(DOCS, "data", "soil.pmtiles"))
else:
    print("WARNING: tiles/soil.pmtiles not found; the map will not work (run tiles/build_tiles.py)")
open(os.path.join(DOCS, ".nojekyll"), "w").close()

app_version = re.search(r'APP_VERSION="([^"]+)"', open(os.path.join(ROOT, "mobile", "app.js"), encoding="utf-8").read()).group(1)
version = app_version + "-" + hashlib.sha1(html.encode("utf-8")).hexdigest()[:8]
precache = ["./", "index.html", "manifest.webmanifest", "vendor/maplibre-gl.js", "vendor/maplibre-gl.css", "vendor/pmtiles.js",
            "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"]
sw = open(os.path.join(ROOT, "pwa", "sw.js"), encoding="utf-8").read().replace("__VERSION__", version).replace("__PRECACHE__", str(precache).replace("'", '"'))
open(os.path.join(DOCS, "sw.js"), "w", encoding="utf-8").write(sw)

total = 0
for dp, _, fs in os.walk(DOCS):
    for f in fs:
        total += os.path.getsize(os.path.join(dp, f))
print("docs/ built: version", version, "|", round(total / 1e6, 1), "MB in total")
for dp, _, fs in os.walk(DOCS):
    for f in sorted(fs):
        p = os.path.join(dp, f)
        print("  %-34s %8.0f KB" % (os.path.relpath(p, DOCS).replace("\\", "/"), os.path.getsize(p) / 1024))
