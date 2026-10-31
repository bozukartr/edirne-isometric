# Performance and verification

## Current version 3.2

The GPU container could collapse to zero height when MapLibre added its `.maplibregl-map` class: the later vendor stylesheet overrode the application's `position: absolute` with `position: relative`. The stylesheet order and scoped full-size rule are corrected. A real-browser CSS fixture using the original adverse stylesheet order measured 1363 × 0 before and 1363 × 936 after. Runtime size checks prevent a collapsed viewport from being treated as a successful 3D startup. Actual startup failures are now shown in the UI.

This verifies the layout defect and fix; the cloud browser still cannot perform a full WebGL visual test.

## Independent 2D startup

Startup now returns a working DOM-based 2D camera immediately. 3D is an independent, cancellable transition, initiated by the toolbar or `?mode=3d`. Engine imports and map readiness have unconditional deadlines. A startup failure keeps the 2D viewer alive; selecting 2D also destroys an active GPU map. A late result from a cancelled attempt is discarded.

Image requests try both official Esri hosts with a deadline per attempt. If external imagery is unreachable, a locally generated 2400 × 2066 WebP plan-view map (515,790 bytes) keeps the city visible without a third-party tile request. A browser fixture deliberately used a missing imagery URL and verified this fallback with real DOM image decoding and display.

## 3D rendering

Version 3 streams real aerial imagery and draws photo-textured buildings with a custom MapLibre WebGL 2 layer. Its performance profile differs from the v2 pre-rendered illustration. The measurements below describe **v1 and v2 only**; they are not v3 timings.

The 3D build contains 611 spatial chunks and 708,630 vertices in a 1,833,729-byte gzip (8,503,560 bytes decompressed). Geometry is triangulated and quantized offline. The runtime limits active chunks to 28 on desktop, 16 on mobile, and 12 in low quality. Up to four chunk texture jobs and six image requests run at once. GPU uploads happen inside the custom render callback, at most two per frame. Stale chunks are released, and obsolete completed textures are discarded. There is no recurring animation loop requested by the building layer while idle.

Ground imagery is managed by MapLibre. The WebGL-free fallback uses DOM satellite tiles, bounded tile retention, throttled tile selection, and compositor camera transforms. It does not import MapLibre or download building geometry. Both modes require a network connection for imagery.

### Verification

- 32 tests passed, covering full mesh validation, projections, deadlines, retry/cancellation, provider failover, and local recovery assets.
- Application and 3D module JavaScript syntax checks passed.
- GLSL ES 300 shaders compiled and linked using Mesa EGL / llvmpipe.
- Chrome desktop and 390 × 844 mobile fallback checks passed for actual aerial imagery, Turkish search, place cards, navigation, and native imagery resolution limits.
- The cloud browser exposes neither WebGL nor WebGL 2. **The actual browser 3D composition, texture registration, camera behavior, and GPU frame rate remain visually unverified.** Shader compilation alone does not establish those results. No v3 FPS or device-performance claim is made.

The native World Imagery source is capped at zoom 18 after a browser check showed unavailable-data placeholders at level 19 around the city center. Higher camera zoom magnifies the available images.

---

# Performance: v1 → v2

## Root cause

Version 1 drew roads, land-use polygons, building walls and roofs, dome facets, and trees on the main-thread canvas during camera movement. Each frame also rebuilt and sorted the visible object list. The main scene had 2,904 source building footprints, so increasing building coverage would make this approach more expensive.

## Change

Version 2 renders all city geometry offline. The browser loads a 110 KB overview followed by the visible WebP tiles at a suitable resolution. Camera movement changes one parent `translate3d(...) scale(...)` transform, plus small marker/minimap UI updates. Geometry draw calls per interaction frame: **zero**.

Tile selection is throttled to once per 100 ms during movement. The previous resolution stays until replacements are ready. Offscreen images are removed; the DOM is bounded to at most 24 map tiles during a resolution transition. No recurring animation frame is scheduled while idle. Raster resolution follows zoom, device pixel ratio, and the user's quality setting.

The complete four-level pyramid is about 10 MB on disk. Visitors download the overview and visible tiles, rather than the entire pyramid or the source geometry database. There is no image generation, geometry triangulation, or rendering library on the client.

## Controlled Chrome comparison

Measured in the same cloud Chrome environment at the default viewport. Each version performed 60 camera updates at zoom 0.65; the first five updates were excluded. Version 1 rendered its original OSM scene. Version 2 updated the richer, 16,563-building raster scene.

| Main-thread update cost | Version 1 | Version 2 |
| --- | ---: | ---: |
| Samples | 55 | 55 |
| Median | 54.7 ms | < 0.1 ms |
| 95th percentile | 79.9 ms | 0.1 ms |
| Maximum | 87.1 ms | 0.2 ms |

These are synchronous JavaScript/update costs. They exclude GPU composition, network transfer, image decoding, and display refresh; they are **not FPS measurements or a guarantee for a particular device**. The purpose is to verify that moving the map no longer performs thousands of geometry draw operations on the main thread.

A repeatable diagnostic is available at `?benchmark=1`. It runs only when explicitly requested by that query and writes JSON to the hidden `#performance-report` element. `#viewport` data attributes expose the last update duration, update count, and tile count for QA. Ordinary visits do not run the benchmark.

Desktop and a 390 × 844 iframe viewport were also checked manually for drag/zoom, Turkish search, landmark selection, the minimap, day/evening settings, and resolution changes. Automated tests check bounded tile selection and the existence of every pyramid tile.
