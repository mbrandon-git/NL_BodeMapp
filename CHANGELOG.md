# Changelog

Pages live in `desktop/` and `mobile/`; both use the same logic in `shared/core.js` (colour rules, drawing), so a rule change shows up in both.
`python build.py` writes single-file versions to `dist/`. Frozen reference copies live in `releases/`.

## v0.5-mobile (2026-10-19): captions, location lookup, installable web app
- **Map-code captions.** Letters in front of or behind a base unit are explained in plain English (e.g. `zgY30` = Y30 + z, sand cover 0.15 to 0.4 m + g, gravel starting shallower than 0.4 m). New "Map code variant" dropdown per unit (1,166 map codes; the code search also finds them); each variant has its own profile versions. Low-confidence translations are marked with "?".
- **Location lookup and map (web app).** A "Map and my location" tab: soil map over the Kadaster BRT basemap, tap the map or use "My location"; the profile page then shows the map unit found, with the neighbouring units within about 100 m. Tested against the original GeoPackage at 40 random polygon points: map code and profile id matched in 40 of 40. "No soil map data" is shown for built-up areas or water.
- **Installable (PWA).** Manifest, icons, service worker (profile pages work offline after the first visit); built into `docs/` for GitHub Pages (`python build_web.py`). Not tested on a real iPhone yet; the in-app browser cannot register service workers (its logic was tested with a mock).
- New: `tiles/build_tiles.py` (37 MB PMTiles, zoom 6-12), `vendor/` (MapLibre GL JS 4.7.1, pmtiles 3.2.1), `tools/serve.py` (local server with Range support), `.gitignore`, a rewritten README with the GitHub Pages steps.
- The Claude artifact version has the captions but no map or location (the artifact sandbox blocks both).
- Desktop page unchanged (v0.3).
## v0.4-mobile / v0.3-desktop-grid (2026-10-15)
- **Horizon codes explained.** Every layer now has a plain-English breakdown of its code (e.g. Aap: A = topsoil horizon, a = imported material, p = regularly cultivated/ploughed). Phone: a "Layers" list under the profile, and tapping a layer name on the drawing opens its explanation. Desktop: a "What the horizon codes mean" section per card. All 56 distinct codes in the profile data are covered (checked).
- **Translation file expanded to 169 rows** using the documents in `Documentation/` (Siderius & de Bakker 2003 on soil names; the WUR field handbook; De Bakker & Schelling's classification system). New: soil orders, 49 name components (holt, veld, koop, ...), horizon master letters, suffix letters and digits, fraction limits (lutum, silt, leem, sand, gravel, stones). New column `english_short` (used for one-line summaries).
- **Changes visible in the app:** 'Brikgronden' is now shown as 'Brick soils'; 'Leemgronden' stays 'Loam soils' (an earlier draft of this version changed it to 'Silty (leem) soils'; reverted at the project owner's request because Dutch 'leem' means both the below-50-micrometre fraction and a sand/silt/clay mixture); the bottom-layer `g` addition now follows the fuller official definition. 'grind' is recorded as gravel (2 to 64 mm) per the handbook.
- Several uncertain rows were upgraded using official Dutch definitions (zanddek, kruinige percelen, toemaakdek, kleefaarde, katteklei, potklei, vuursteeneluvium); the changes and their basis are in the CSV.
## v0.3.1-mobile / v0.2.1-desktop-grid (2026-10-14)
- All English translations now live in one file, `shared/translations.csv` (79 rows: main soil classes, parent-material terms, land use, peat types, the 28 top/bottom-layer letter additions, and terms used in discussion). Each row has a confidence level, the basis for the translation, a status, and blank columns for an expert's review. The app reads it through `shared/translations.js`, which `build.py` regenerates.
- Both pages show how many translations an expert has reviewed (currently 0 of 78).
- `grind` is translated as "gravel (coarser than 2 mm)", accepted by the project owner.
- No visible change to profiles or colours.

## v0.3-mobile (2026-10-14)
- New `mobile/` page: one profile at a time, searchable unit picker (grouped by main soil class), previous/next buttons, profile-version dropdown, light and dark themes.
- Published as a private Claude artifact (see README for the link).
- Tested at 375 px: no sideways overflow. Not yet tested on a real iPhone.

## v0.2-desktop-grid (2026-10-14)
- Same page as v0.1, but its logic moved into `shared/core.js`. Self-test result identical to v0.1 (368 profiles drawn, 585 mottled horizons, no errors).
- Profile versions show land use; "needs JavaScript" notice added.

## v0.1 (2026-10-13), frozen in `releases/v0.1_desktop-grid_standalone.html`
- First prototype: grid of cards (4 test units + add any of 305), rule-based colours, horizon tables.
- This is the file to keep for reference.
