# NL_BodeMapp

Hobby project: a Dutch "typical soil profile at my location" app, in the spirit of USDA SoilWeb (no SoilWeb code or branding used).
Separate from the PhD work. Data: BRO Bodemkaart (SGM) V2025-01, Wageningen Environmental Research / BRO, CC0.

## Decisions so far
- Show the profile assigned to the polygon in the Bodemkaart data (not the code's other versions); main soil unit only.
- English only; every translation of a Dutch term is logged in `shared/translations.csv` for expert review.
- Horizon colours are derived from rules and labelled as schematic. They are not validated yet.
- Web app first (installable, hosted on GitHub Pages), native iOS app later via Capacitor (see the end of this file).

## What the app does
- **Profile view:** a 3D soil column for any of 305 soil units, with horizon codes explained, parent material, and the map-code variants (extra letters such as the `z` and `g` in `zgY30`) explained.
- **Map and location (web app only):** soil map over the Kadaster BRT basemap; tap the map or use "My location" to find the map unit and its typical profile, with a note when other units lie within about 100 m.
- **Installable:** manifest + service worker; the profile pages work offline after the first visit. The map needs a network connection.

## Folder layout
- `mobile/` phone page: `index.html` (markup, CSS), `app.js` (profile view, picker, captions), `map.js` (map tab; only active when the map libraries are present).
- `desktop/index.html` grid of cards for desktop (kept for reference; v0.1 is frozen in `releases/`).
- `shared/` code and data used by both pages: `core.js` (colour rules, drawing, horizon and map-code explanations), `profiles_data.js` (generated), `munsell_lookup.js` (generated), `translations.csv` -> `translations.js`, and the generators `build_data.py`, `build_munsell_lookup.R`, `build_translations.py`.
- `tiles/build_tiles.py` builds `tiles/soil.pmtiles` (vector tiles of the 48,025 polygons, zoom 6-12, about 37 MB) with the QGIS Python (GDAL 3.12 writes PMTiles).
- `vendor/` MapLibre GL JS 4.7.1 and pmtiles 3.2.1 (both BSD-3-Clause), downloaded from the jsDelivr CDN on 2026-10-19 and kept here so the app does not depend on a CDN.
- `pwa/` `manifest.webmanifest`, `sw.js` (template), `make_icons.py` and the generated `icons/`.
- `build.py` single-file builds into `dist/` (desktop, mobile, and the Claude-artifact version without the map).
- `build_web.py` builds `docs/`, the folder GitHub Pages serves (index.html, vendor/, icons/, manifest, sw.js, data/soil.pmtiles).
- `tools/serve.py` tiny local web server with HTTP Range support (needed for the tile file; Python's own server lacks it).
- `releases/` frozen copies to keep. `Documentation/` reference PDFs (third-party; do not publish, see below). `CHANGELOG.md` what changed.
- `shared/translations.csv` columns: id, category, dutch, english, english_short, confidence, basis, status, used_in_app, dutch_source, notes, reviewer, review_date, reviewer_comment. Set `status` to `reviewed ...` once an expert has confirmed a row. Rows with an empty `english` column stay Dutch. Horizon rows use codes in the `dutch` column (`A`, `B`, ... masters; `A+h`, `B+h`, `*+a` suffix letters by master horizon, `*` = any).

## Rebuilding
1. Data (only if the source data or the scripts change): `cd shared` then `python build_data.py`; the Munsell lookup with R 4.4.3 `Rscript build_munsell_lookup.R`.
2. Tiles (only if the data changes; takes about 2.5 minutes): `"C:/Program Files/QGIS 3.44.9/bin/python-qgis-ltr.bat" tiles/build_tiles.py`
3. Icons (once): `python pwa/make_icons.py`
4. Web app: `python build_web.py`
5. Test on your computer: `python tools/serve.py docs 8766`, then open http://localhost:8766/ (location and install also work on localhost).
6. Single-file versions: `python build.py`. The private Claude artifact (profiles only, no map) is `dist/NL_BodeMapp_mobile.artifact.html`: https://claude.ai/artifact/2ABAeAtAGVLgcLXtH4EJ1m

## Publishing on GitHub Pages
You create and push the repository yourself; nothing here does it for you.
1. On GitHub create a new **public** repository (for example `nl-bodemapp`). Pages then serves `https://<your-user>.github.io/nl-bodemapp/`.
2. In `NL_BodeMapp`: `git init`, `git add .`, `git commit -m "NL BodeMapp"`, `git branch -M main`, `git remote add origin https://github.com/<your-user>/nl-bodemapp.git`, `git push -u origin main`. The `.gitignore` already keeps out `Documentation/` (third-party PDFs) and the duplicate tile file in `tiles/`.
3. Repository Settings, Pages: Source = "Deploy from a branch", branch `main`, folder `/docs`. After a minute the site is live.
4. Check that the host supports byte ranges (the map needs it): `curl -I -H "Range: bytes=0-1" https://<your-user>.github.io/nl-bodemapp/data/soil.pmtiles` should answer `206 Partial Content`. If it does not, use another static host (Netlify, Cloudflare Pages) for `docs/`.
5. On the iPhone open the address in Safari, then Share, "Add to Home Screen". Allow location when asked. Test once in airplane mode: the profile pages should open, the map will not.
6. Updating: rebuild, `git add docs`, commit, push. Each new version of `soil.pmtiles` is stored in git history (about 37 MB each), so change the tiles rarely.

Before making the repository public:
- `Documentation/` holds PDFs by WUR and others (copyright). They are in `.gitignore`; keep it that way.
- Build scripts contain your Windows user path (`C:/Users/brand153/...`). That is harmless but personal; replace it with a relative path if you prefer.
- Quotes of Dutch definitions in `translations.csv` (handbook, legend) are short, but check the source licences before a public release.
- Colour rules and translations are drafts; the pages say so.

## Privacy
The location is only used in your browser and is never sent to a server by this app. Loading map tiles tells the tile servers (the host of the app, and PDOK/Kadaster for the basemap) which area you are looking at.

## Data notes
- Local source copy: `C:\Users\brand153\Desktop\PhD_working_directory\Data\Raw_unzipped\Bodemdata\Levering-BRO-SGM-V2025-01_1\` (do not edit there). Original: PDOK atom feed `https://service.pdok.nl/tno/bro-bodemkaart/atom/index.xml`.
- Link chain: `soilarea.maparea_id -> soilarea_normalsoilprofile -> normalsoilprofiles.normalsoilprofile_id -> soilhorizon / soillayer`. Always link by profile ID, never by profile code (48 codes have several profiles).
- `soilhorizon`: `uppervalue` = bottom depth, `lowervalue` = top depth, metres (names swapped). `soillayer` depths are in cm. Horizons have no colour field.
- Map codes: letters in front of the base unit are top-layer additions, letters behind are bottom-layer additions (1,166 distinct main codes; compound codes with `/` show the main unit only).
- 143 of 305 map codes have no profile of their own and use a stand-in profile; not yet checked for plausibility.

## Colour approach
Rules estimate a moist Munsell colour per horizon from organic matter, lutum (clay), peat type, iron (`fedith`) and horizon letters; Munsell is then converted to hex (renotation data from the R `munsell` package). The rules are listed on the pages and live in `RULES` / `estimate()` in `shared/core.js`. Add `?selftest` to a page URL to draw all 368 profiles and print a summary.

## Later: native iOS app
Capacitor can wrap the same `docs/` folder as an iOS app (Apple Developer account, a Mac or cloud build). Keep paths relative, bundle the assets (service workers do not help in the native web view), and keep the tile URL in one setting (`window.NLBM_CONFIG.tilesUrl`) so it can point to a bundled file. Apple may reject apps that are only a thin website wrapper, so offline data and native location help.
