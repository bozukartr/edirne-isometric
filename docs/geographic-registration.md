# v6: geographic registration instead of generated resemblance

## Problem fixed

The v4 independent generative region images changed street patterns, riverbanks, building scale and landmark details. v5 removed their joins by using a single 1672 × 941 image, but that master was itself geographically altered. A single incorrect image is not geographic consistency.

v6 removes those source images, their raster pyramids and the redraw/region builder. No image-generation step is used for the published map.

## One coordinate system

1. Convert WGS84 longitude/latitude to normalized spherical Web Mercator (EPSG:3857 / XYZ tile coordinates).
2. Subtract the shared origin (26.555 E, 41.676 N) and use one constant local scale at that origin.
3. Apply the same fixed matrix to satellite pixels, markers, the minimap and coordinate-derived local fallback: rotation −π/7, vertical scale 0.58.
4. Translate and uniformly scale the complete world for the current camera. Camera changes do not regenerate or reposition geographic content.

Each original 256-pixel provider tile uses its exact Mercator extent; corner matrices meet at identical coordinates. There are no image-based manual shifts, stretch-to-fit region boundaries or estimated building-height offsets. CSS layers preserve this registration, including screen-size marker dots anchored at the actual coordinate.

Source `map.js` uses an earlier local equirectangular coordinate compiler. The fallback builder explicitly converts those original coordinates back to longitude/latitude and then to the new Mercator system; simply reinterpreting them as Mercator would introduce avoidable drift.

Cards and detail pictures are requested from the same World Imagery service with EPSG:3857 bounding boxes centered on each place coordinate. Their images use the exact same angle coefficients as the main map. Provider export pictures and tiled imagery may have different resampling/detail selection; no new content is synthesized.

## Actual imagery vs. fallback

The primary map, place imagery and small map request real provider imagery at runtime. No third-party imagery is mirrored in git or rebuilt as a downloadable offline cache. Attribution names the provider/contributors in the interface and documentation.

If imagery fails, the viewer leaves the geographically projected local source drawing underneath, reports the failure, and exposes a retry. The fallback is a schematic rendering of the input features, not an aerial photograph or photogrammetric reconstruction. Its road/river widths and data completeness inherit source limitations.

## Verification

`tests/registration.test.cjs` independently calculates XYZ pixel coordinates using the logarithmic Web Mercator formula and verifies all twelve landmarks against the display matrix at every source level 12–19. Tests also verify shared tile edges, pin/photo alignment during camera zoom changes, source-coordinate conversion, viewport coverage within request budgets, and centered export-image bounds.

`tests/imagery-loader.test.cjs` verifies bounded network concurrency, failures without automatic retry loops, cancellation of obsolete requests, manual recovery and timeouts for hung images. Other tests cover source data, search normalization, fallback artifacts and both HTML entry points.

Browser QA checks actual image loads, selected landmarks over the photo, zoom/pan, the mobile layout and the explicit failure/retry state. Mathematical registration error is not a measurement of real-world positional accuracy.

## Limits

This is the original aerial/satellite image shown at an oblique fixed angle. It does not reveal building facades hidden from the source camera, or recover heights, terrain or measured 3D geometry. No such detail is invented to imitate the reference projects. The provider determines image capture dates, native resolution, orthorectification and potential mosaic seams. Place coordinates and open-data outlines also retain their own errors. This is not a cadastral or survey product.

Primary service/usage references:

- Esri World Imagery: https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9
- Official example using the public World Imagery tile service: https://developers.arcgis.com/javascript/latest/sample-code/layers-imagerytilelayer/
- Offline tiles are a separate licensed workflow; this application does not export them: https://www.arcgis.com/home/item.html?id=226d23f076da478bba4589e7eae95952
