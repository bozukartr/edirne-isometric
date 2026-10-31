# Illustrated atlas: performance and validation

The current map uses a fixed-angle illustrated image pyramid. No city geometry or GPU map engine runs in the browser. Five original region illustrations are packaged offline into 68 WebP tiles at 0.125, 0.25, 0.5, and 1 pixel per projected world unit, plus an overview and place thumbnails.

Dragging updates one parent transform. Tile selection is throttled to once per 100 ms; offscreen images are removed and the previous resolution stays until replacements arrive. There is no recurring animation loop while the map is idle. The source database and full source illustrations are not requested by the viewer. There are no third-party tile, font, analytics, or engine requests.

The offline packager also has bounded raster memory: source regions are feathered at their native image dimensions, and one tile-sized canvas is reused for outputs. It does not allocate a full 9102 × 5120 city raster.

The view is an artistic image map. Native source resolution varies between the overview and detailed regions. Zoom is limited to avoid excessive enlargement; architectural detail and fine geographic registration are approximate.

## Validation

Automated checks cover projections, search normalization, bounds, source data counts, tile selection and resolution, the complete tile pyramid and thumbnails, five source image payloads, detailed-region coverage of every landmark, both HTML entries, and the absence of WebGL/external imagery dependencies from the live viewer.

Browser QA checks desktop and 390 × 844 mobile layouts, navigation, search, place cards, image loading, and settings. The browser's unavailable WebGL support does not affect this viewer.

An explicit `?benchmark=1` diagnostic writes synchronous camera/UI update costs to `#performance-report`. These costs exclude image decoding, compositor work, network transfer, and display refresh; they are not FPS measurements.

The v4 Chrome diagnostic ran 60 synchronous camera updates and excluded the first five. Across 55 samples, the median was **0.1 ms**, the 95th percentile **0.2 ms**, and the maximum **0.7 ms**. Nine map tiles were active; geometry draws per update were zero. These are JavaScript camera/UI costs, not GPU frame time or an FPS guarantee.
