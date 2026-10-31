# Isometric Edirne

A detailed, illustrated map of **Edirne / Merkez**, inspired by [Isometric Istanbul](https://isometricistanbul.com/) and [Isometric NYC](https://isometric.nyc/). Explore the city from one fixed isometric angle: drag to move, zoom into neighborhoods, and open the stories behind 12 landmarks.

**[Open the map](https://bozukartr.github.io/edirne-isometric/)**

![Isometric Edirne](docs/preview.jpg)

## Illustrated city atlas

The map uses **one whole-city master illustration**. Every zoom level, overview, minimap and all twelve place cards are deterministic crops of that same image. Independent regional redraws and overlap masks were removed because they changed streets, riverbanks and building scale across the joins.

The master is 1672 × 941 pixels. The pyramid contains **5 WebP tiles**, without synthetic higher-resolution levels; zoom is capped at twice the native source density. This fixes regional visual discontinuities, but does not create additional architectural detail.

The browser displays these ready-made pictures using ordinary HTML/CSS image layers. It requests only visible tiles and moves a compositor transform while dragging. There is no WebGL requirement, rotating camera, live 3D scene, external satellite service, map API key, or login. All runtime images are served from this repository.

The architectural detail is an **AI-assisted artistic interpretation**. Road/river layout and landmark positions are based on the source composition, but generated details can differ from reality. Building heights are partly estimates. This is an exploration illustration, not surveyed imagery or an address-navigation map.

## Run

```sh
npm start
```

Open **http://localhost:5173**. The committed application needs no dependency installation or build step to serve. Alternatively:

```sh
python3 -m http.server 5173 --directory dist
```

## Controls

- Drag to pan; scroll, double-click, pinch, or use **+ / −** to zoom.
- Search Turkish names with or without accents: `uc serefeli`, `karaagac`.
- Select a landmark thumbnail or marker to open its description.
- Click the minimap to move across the city.
- Settings: natural/dark tone, place markers, neighborhood labels, and image detail.
- Share copies the selected place or current fixed-angle camera position.
- Keyboard: arrows move, Shift + arrows move farther, + / − zoom, R resets, / searches, Escape closes panels.
- Reduced-motion preferences are respected. Zoom is capped at the useful detail range of the illustrations.

## Data and credits

The source database contains **16,563 building footprints**: 2,904 from OpenStreetMap and 13,659 additional Microsoft footprints after overlap filtering. Coverage is the urban center, Sarayiçi, Yeniimaret, and Karaağaç: **26.511–26.595° E, 41.646–41.700° N**.

- **© OpenStreetMap contributors**, ODbL 1.0; snapshot 2026-10-31.
- **Microsoft GlobalMLBuildingFootprints**, CDLA Permissive 2.0; snapshot 2026-08-13.
- Original scene rendering, illustrated image generation, and interface prepared for this project.

The combined source database retains ODbL 1.0 and the Microsoft notice/license. The map images retain their source attribution. No imagery from the reference sites, Google, or Esri is included. See [data provenance](dist/data/README.md) and [illustration prompts and method](docs/illustration-prompts.md).

## Rebuild

```sh
npm install
npm run atlas
npm run pages
npm run check
```

`npm run atlas` packages the single committed master illustration into the tile atlas; it makes no network requests. The packaging process reuses one tile-sized canvas and does not allocate a full-city raster. `@napi-rs/canvas` is only an offline build dependency.

`npm run guides` recreates the open-data composition guides under `tmp/illustration-guides/`. Changing the source geometry requires reviewing the whole-city master. Separate generated regional overlays must not be reintroduced.

## Verification

Tests cover geographic projections, Turkish search, data bounds, source attribution, pointer-anchored zoom, tile selection and resolution, every published tile and thumbnail, illustration bounds, one-master coverage of all landmarks and decoded-pixel comparisons of every tile and card against that master, and both HTML entry points. Desktop/mobile navigation and loading are checked in Chrome with WebGL unavailable. [Performance and verification notes](docs/performance.md).

## GitHub Pages

Configured as **Deploy from a branch → `main` → `/ (root)`**. The generated root `index.html` loads assets from `dist/`; `.nojekyll` bypasses Jekyll. Run `npm run pages` after editing `dist/index.html`. Updates pushed to `main` publish automatically.

`dist/` is also a complete static-hosting folder. The source master illustration are in `assets/illustrations/`; the deployed application loads only the packaged files in `dist/atlas-v5/`.
