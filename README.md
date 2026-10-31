# Edirne — Isometric Atlas

An interactive, isometric atlas of **Edirne / Merkez**, built with plain HTML, CSS, JavaScript, and Canvas 2D. Inspired by the spirit of [Isometric NYC](https://isometric.nyc) and [Isometric Istanbul](https://isometricistanbul.com); the implementation and landmark illustrations are original.

Explore the historic center, Tunca and Meriç river corridors, Sarayiçi, Yeniimaret, and Karaağaç.

[Open the public live atlas](https://bozukartr.github.io/edirne-isometric/)

![Edirne isometric atlas preview](docs/preview.jpg)

## Run locally

Requires Node.js 20+ only for the convenient development server and tests. No dependencies to install, no build step, and no API keys.

```sh
npm start
```

Open **http://localhost:5173**. Alternatively, serve `dist/` with any static HTTP server:

```sh
python3 -m http.server 5173 --directory dist
```

## Explore

- Drag to pan; scroll, pinch, or use **+ / −** to zoom around the pointer.
- Search names with or without Turkish accents: `uc serefeli` and `karaagac` work.
- Filter heritage, bridges, and nature; select a list item or a map pin for its story.
- Select **Take the scenic route** to step through ten landmarks. This is an editorial sequence, not a calculated walking itinerary.
- Copy a place link to share its URL fragment, such as `#selimiye`.
- Switch day/evening lighting. The preference is saved locally in your browser.
- Toggle pins, labels, and 3D buildings using the layers button.
- On mobile, open **Explore Edirne** for the searchable drawer.
- Keyboard: arrows pan, Shift + arrows pan farther, + / − zoom, R resets the view, / focuses search, and Escape closes panels.

## Map data and scope

The included snapshot contains **2,904 OpenStreetMap building footprints** and **7,516 total features**, including real streets, waterways, and land-use geometry, downloaded on **31 October 2026**.

Coverage: bounding box **26.511–26.595° E, 41.646–41.700° N**. This is the urban area of Merkez and Karaağaç, not the full rural administrative district. No live map service is needed after the page loads.

OSM coverage varies: an empty block means a building footprint was not in the source snapshot. The application does not invent missing buildings. Heights are taken from OSM where available; otherwise deterministic estimates are used and vertically emphasized for legibility. Tree placement is illustrative within mapped green areas. River centerlines are real, but widths are stylized where polygon geometry is unavailable. Terrain is flat. Landmark shapes are artistic approximations rather than surveyed 3D models.

**© OpenStreetMap contributors.** The derived map database in `dist/data/map.js` is distributed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). See [data sources and credits](dist/data/README.md). Retain the on-map attribution when adapting the project.

### Refresh the snapshot

```sh
python3 scripts/prepare-data.py
```

Or compile a previously downloaded OSM XML extract:

```sh
python3 scripts/prepare-data.py path/to/snapshot.osm
```

The script uses the public OSM map endpoint once, performs coordinate conversion and clipping, and writes the self-contained `map.js` file atomically. Be considerate of the public API; this is a manual refresh tool, not a polling service.

## Project structure

```text
dist/
  index.html           Semantic application shell
  styles.css           Responsive layout and day/evening themes
  app.js               Canvas renderer, UI, camera, and interactions
  geometry.js          Geographic projection and camera math
  favicon.svg          Original vector icon
  data/
    map.js             Bundled ODbL OpenStreetMap snapshot
    places.js          Curated landmark directory and original copy
    README.md          Data provenance and interpretation notes
scripts/
  serve.mjs            Dependency-free static development server
  prepare-data.py      Reproducible OSM snapshot compiler
tests/
  atlas.test.cjs       Projection, zoom-anchor, data integrity tests
```

## Verification

```sh
npm test
```

Tests cover coordinate round trips, isometric inversion, pointer-anchored zoom and limits, Turkish name normalization, landmark IDs and coverage, finite bounded geometries, polygon closure, metadata consistency, and local script references. Desktop and a 390 × 844 mobile viewport were also checked in Chrome for search, filters, place details, URL fragments, map layers, and theme switching.

## Deploy

Upload the contents of **`dist/`** to any static host. All resource URLs are relative, so repository subpaths work. Google Fonts is optional; local serif and sans-serif fallbacks keep the atlas usable if the font CDN is unavailable. The map itself never requests third-party tiles.

GitHub Pages publishes directly from **`main` → `/ (root)`** using **Deploy from a branch**. The repository-root `index.html` loads the same application assets from `dist/`. `.nojekyll` disables the Jekyll build step.

After changing `dist/index.html`, run `npm run pages` to refresh the root entry before committing. Pushes to `main` automatically publish updates. No separate deployment branch or custom Actions workflow is required.

## Architecture

Longitude and latitude are converted to local equirectangular meters around Edirne. A fixed orthographic isometric projection compresses the ground plane. Canvas paths are prepared once, visible geometry is culled, and buildings and trees are sorted by depth. The scene redraws only on camera or UI changes. Device pixel ratio is capped at 2 for mobile memory use.

Landmark markers are ordinary accessible HTML buttons. The directory provides a keyboard-accessible alternative to interacting with the canvas. Motion respects `prefers-reduced-motion`. There are no accounts, analytics, API tokens, or runtime dependencies in the application.
