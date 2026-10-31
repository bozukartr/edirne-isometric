# Isometric Edirne

An interactive aerial map of **Edirne / Merkez**, inspired by [Isometric Istanbul](https://isometricistanbul.com/) and [Isometric NYC](https://isometric.nyc/). HTML, CSS, and JavaScript, with locally vendored MapLibre GL JS.

**[Open the map](https://bozukartr.github.io/edirne-isometric/)**

![Live satellite view in the 2D browser fallback](docs/preview.jpg)

*Screenshot: the actual satellite fallback. The QA browser has WebGL disabled.*

## Version 3.1: loading recovery

The map now opens immediately in an **independent 2D satellite viewer**. Select **3D** in the top toolbar to start the GPU renderer. 2D navigation stays available throughout startup. Switching back to 2D cancels pending initialization and releases an active GPU map. A failed or timed-out 3D attempt preserves the working 2D view and can be retried.

`?mode=2d` explicitly starts without importing MapLibre; `?mode=3d` attempts 3D while keeping the initial 2D map available. Asset versions are bumped to avoid mixing cached startup code. Map initialization has an unconditional deadline, including the case where the style reports ready but the map's `load` event never fires.

Live image requests retry the second official Esri host after an error or timeout. If neither responds, a **local plan-view map** generated from the open building/road data appears automatically, with an explicit notice that satellite imagery is unavailable. The backup contains no provider imagery. It is a recovery view, not a satellite image. `npm run fallback` rebuilds its committed WebP and bounds manifest.

## Aerial photography and 3D buildings

The default view uses **live Esri World Imagery** on the ground and geographically aligned aerial photo textures on building roofs. A custom WebGL 2 layer draws nearby buildings, including simplified domes and minarets for Selimiye, Üç Şerefeli, and Eski Cami. The camera can tilt and rotate. The compact dark interface provides Turkish search, 12 landmarks, place cards, a minimap, lighting, and quality settings.

This is an approximate, photo-textured **2.5D reconstruction**. Footprints come from OpenStreetMap and Microsoft; some heights are estimates. Facades and monument geometry are procedural approximations, and terrain is flat. It is not a photogrammetric city scan. Imagery dates, registration, resolution, and building footprints may differ.

**WebGL 2 and DecompressionStream are required for 3D.** Unsupported browsers keep using the independent **2D satellite map**. The fallback does not download the 3D engine or building geometry. Internet access to Esri is required for satellite imagery in both modes; the local recovery map is served from this repository. Available native imagery is capped at zoom 18 to avoid the provider's “map data not yet available” tiles at higher levels in this area. Further zoom magnifies the available imagery.

## Run

```sh
npm start
```

Open **http://localhost:5173**. Serving the committed application requires no package installation or API key. Third-party imagery is streamed from the public World Imagery service. Alternatively:

```sh
python3 -m http.server 5173 --directory dist
```

## Controls

- Drag to move; scroll, double-click, pinch, or use **+ / −** to zoom.
- In 3D, right-drag or Ctrl-drag to rotate and tilt; use the north button to reset bearing.
- Settings: **Uydu / 3D**, camera pitch, day/evening, markers, neighborhood names, and quality.
- Search Turkish names with or without accents: `uc serefeli`, `karaagac`.
- Click a landmark thumbnail or marker to open its details.
- Click the minimap to move across the city.
- Share copies the selected place or camera position, zoom, pitch, and bearing.
- Keyboard: arrows move, Shift + arrows move farther, + / − zoom, R resets, / searches, Escape closes panels.
- Reduced-motion preferences are respected.

## Geometry and performance

The source database contains **16,563 building footprints**: 2,904 OSM footprints and 13,659 additional Microsoft footprints after overlap filtering. The compiler replaces overlapping landmark geometry with three approximate mosque models, producing 16,559 model entries across 611 spatial chunks.

Buildings are triangulated and quantized offline into a **1.83 MB gzip** buffer (8.50 MB decompressed, 708,630 vertices). The browser only uploads nearby chunks to the GPU: up to 28 on desktop, 16 on mobile, or 12 at low quality. At most four chunk texture jobs and six imagery requests run concurrently. Uploads are limited to two chunks per frame. No geometry triangulation runs during interaction, and the custom layer does not request animation frames while idle.

MapLibre also streams the visible ground imagery. The 2D fallback moves tiled images with a compositor transform and performs no building rendering. Device performance and network speed still affect responsiveness. No FPS claim is made.

## Data and imagery

Building coverage: **26.511–26.595° E, 41.646–41.700° N**, covering the urban center, Sarayiçi, Yeniimaret, and Karaağaç.

- Building footprints: **© OpenStreetMap contributors**, ODbL 1.0; snapshot 2026-10-31.
- Additional footprints: **Microsoft GlobalMLBuildingFootprints**, CDLA Permissive 2.0; snapshot 2026-08-13.
- Live imagery: **Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community**. See the [World Imagery item and applicable terms](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9).
- MapLibre GL JS 6.16.0: BSD 3-Clause, license included in `dist/vendor/maplibre/LICENSE.txt`.

The source database and compiled geometry are distributed under ODbL 1.0 with the Microsoft notice and license retained. **Satellite imagery is not bundled or licensed by this repository**; it is fetched live and remains subject to the provider's terms. Do not use this repository as permission to export, bulk download, or redistribute the imagery. The application has no offline imagery cache. Provider availability and terms may change. See [data provenance](dist/data/README.md).

No reference-site imagery or code was copied. The older illustrative WebP pyramid remains in `dist/atlas/` as a v2 archive and is not loaded by the current application.

## Rebuild

```sh
npm install
npm run scene3d
npm run pages
npm run check
```

`earcut` triangulates footprints during the offline build. MapLibre's published runtime modules and stylesheet are already vendored. To refresh data, run `python3 scripts/prepare-data.py`, then `python3 scripts/import-microsoft-buildings.py`, and rebuild the scene. The original v2 renderer is retained as `npm run atlas`.

## Validation and limits

Thirty tests cover loading deadlines, cancellation, retry, provider failover, local recovery assets, and source bounds, Turkish search normalization, geographic projections, satellite tile coordinates and preview bounds, matrix precision, chunk offsets, every mesh vertex's height/material/normal, vendored dependencies, HTML resources, and the archived v2 pyramid. Syntax checks cover the application and both 3D modules.

The independent satellite viewer was checked in Chrome on desktop and a **390 × 844** mobile viewport, including search, details, zoom, imagery loading, and recovery after a failed 3D attempt. An injected missing-image URL also verified that complete remote imagery failure displays the local city map. The GLSL ES 300 shaders compiled and linked successfully using Mesa EGL / llvmpipe; the optional check is `python3 scripts/qa/verify-shaders.py` with `moderngl==5.12.0` installed.

**End-to-end 3D visual appearance and GPU frame rate could not be verified in the cloud browser because WebGL is disabled there.** Offscreen shader compilation is not a substitute for browser GPU testing. A WebGL 2 capable browser is needed to assess the tilted model view. [Performance notes and previous measurements](docs/performance.md).

## GitHub Pages

Publication is configured as **Deploy from a branch → `main` → `/ (root)`**. The generated root `index.html` loads assets from `dist/`; `.nojekyll` bypasses Jekyll. Changes on `main` publish automatically. Run `npm run pages` after editing `dist/index.html`.

`dist/` can also be served directly by a static host. Keep the vendored modules, `scene3d/`, and source attribution files with the application. There is no backend, analytics, login, or geolocation request.
