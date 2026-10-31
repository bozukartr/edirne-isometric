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
