"""Builds single-file HTML versions (all scripts inlined) into dist/.
Usage: python build.py
  -> dist/NL_BodeMapp_desktop.html, dist/NL_BodeMapp_mobile.html (whichever page folders exist)
  -> dist/NL_BodeMapp_mobile.artifact.html (title + style + body only, for publishing as a Claude artifact; no map module, because
     the artifact sandbox blocks location access and service workers)
The installable web app for GitHub Pages is built separately: python build_web.py  (-> docs/)
Data files are regenerated separately: run shared/build_data.py and shared/build_munsell_lookup.R from inside shared/."""
import re, os, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PAGES = {"desktop": "NL_BodeMapp_desktop.html", "mobile": "NL_BodeMapp_mobile.html"}
CLOSE = "<" + "/script>"
MAP_TAG = '<script src="map.js"></script>\n'
os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
subprocess.run([sys.executable, os.path.join(ROOT, "shared", "build_translations.py")], check=True)  # translations.csv -> translations.js


def write(name, text):
    with open(os.path.join(ROOT, "dist", name), "w", encoding="utf-8") as f:
        f.write(text)
    print("built dist/" + name, round(len(text.encode("utf-8")) / 1024), "KB")


def inline_scripts(html, page):
    def inline(m):
        js = open(os.path.normpath(os.path.join(ROOT, page, m.group(1))), encoding="utf-8").read()
        return "<script>\n" + js.replace(CLOSE, "<" + chr(92) + "/script>") + "\n" + CLOSE
    return re.sub(r'<script src="([^"]+)"></script>', inline, html)


if __name__ == "__main__":
    for page, out in PAGES.items():
        src = os.path.join(ROOT, page, "index.html")
        if not os.path.exists(src):
            continue
        raw = open(src, encoding="utf-8").read()
        write(out, inline_scripts(raw, page))
        if page == "mobile":
            html = inline_scripts(raw.replace(MAP_TAG, ""), page)
            title = re.search(r"<title>.*?</title>", html, re.S).group(0)
            styles = "\n".join(re.findall(r"<style>.*?</style>", html, re.S))
            body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
            write("NL_BodeMapp_mobile.artifact.html", title + "\n" + styles + "\n" + body)
