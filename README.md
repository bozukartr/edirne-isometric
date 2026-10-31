# Isometric Edirne

**[Open the map](https://bozukartr.github.io/edirne-isometric/)** · Public GitHub Pages, `main` → `/ (root)`.

An interactive, fixed-angle view of **Edirne / Merkez** with real satellite/aerial imagery. Inspired by the exploration interface of [Isometric Istanbul](https://isometricistanbul.com/) and [Isometric NYC](https://isometric.nyc/).

![Isometric Edirne](docs/preview.jpg)

## Geographic consistency

The city is **not redrawn by image generation**. The map displays original Esri World Imagery tiles with one mathematical Web Mercator → fixed isometric affine transform. Streets, riverbanks, parcels and roof pixels remain at their source positions. All twelve place markers use the same projection, without fabricated building-height offsets. Cards use imagery centered on the same geographic coordinates and the same display angle.

No photogrammetric building meshes, invented facades, inferred heights, generated roof details or synthetic neighborhoods are displayed. This is a tilted aerial image, not a claim to measured 3D buildings. Source image dates, ground resolution, orthorectification and positional error are controlled by the imagery provider; real-world surveying accuracy is not guaranteed.

The earlier AI illustrations and their tile atlases were removed. [Registration method and verification](docs/geographic-registration.md).

## Lightweight display and explicit failures

The viewer uses HTML image elements and CSS compositor transforms. No WebGL, map SDK, per-frame city geometry rendering or permanent animation loop is required.

- Loads visible satellite tiles, with an eight-request concurrency cap and a bounded detail budget.
- Cancels obsolete work after panning and zooming; retains previous detail while new images arrive.
- Times out hung image requests and exposes an explicit manual retry.
- Loads a bundled **ground-only geographic drawing** beneath the satellite layer. This drawing comes from actual source roads, waterways and building footprints. It is clearly identified if satellite requests fail, and it contains no generated scenery or invented building heights.
- The imagery is requested directly from the provider. No provider source raster, satellite tile cache or tile archive is included in this repository; `docs/preview.jpg` is an attributed screenshot of the interface. Internet access to the external imagery service is required.

## Controls

Drag, wheel, pinch or double-click to navigate. Use **+ / −**, arrow keys, **R** to reset, **/** to search and **Escape** to close panels. Search Turkish names with or without accents (`karaagac`, `uc serefeli`). Place cards show descriptions, geographic coordinates and links to the mapped location. The minimap, marker visibility, neighborhood labels, natural/dark tone, detail settings and share links remain available.

## Run and rebuild

```sh
npm start
```

Open **http://localhost:5173**. The committed `dist/` is a complete static site; ordinary serving needs no dependency installation or build step.

To rebuild the local geographic fallback after source-data changes:

```sh
npm install
npm run atlas
npm run pages
npm run check
```

`npm run atlas` renders only the open-data fallback assets, without downloading or restyling satellite imagery. `npm run pages` synchronizes the GitHub Pages root entry with `dist/index.html`. Build dependency `@napi-rs/canvas` is not loaded by browsers.

## Sources

- Satellite/aerial imagery: **Esri, Vantor, Earthstar Geographics, and the GIS User Community**. [World Imagery item and source terms](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9). Tiles remain on the provider service; visible attribution is retained.
- Fallback roads, water and mapped buildings: **© OpenStreetMap contributors**, ODbL 1.0; snapshot 2026-10-31.
- Additional fallback building footprints: **Microsoft GlobalMLBuildingFootprints**, CDLA Permissive 2.0; snapshot 2026-08-13.
- The open geometry database contains 16,563 input footprints. These are machine/mapped records with omissions and errors, not a count or survey of buildings visible in the satellite photo.

See [source provenance](dist/data/README.md), the bundled licenses and [performance/QA notes](docs/performance.md). Reference-site artwork is not included.
