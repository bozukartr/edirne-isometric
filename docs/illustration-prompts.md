# Active atlas source and consistency fix (v5)

The active source is `assets/illustrations/city-overview.webp` (1672 × 941 pixels). Only this image is listed in `assets/illustrations/regions.json`. The earlier four independent regional redraws have been removed from the published project because their geography, scale and details did not align.

All five zoom tiles, `overview.webp`, the minimap and all twelve cards under `dist/atlas-v5/` are deterministic encodings/crops of this **same immutable master**. No new image generation was used for this fix. `npm run atlas` packages the source with Node canvas; it does not redraw, composite regions, or synthesize detail. The manifest records its SHA-256, real dimensions and native density. Tests decode every zoom tile and card and compare its pixels to a direct crop of the master.

This ensures internal image continuity, not geographic accuracy. The master remains an AI-assisted artistic interpretation; buildings, roads and landmark registration may differ from reality. There is no surveyed imagery or navigation claim. Source resolution limits the available detail, so zoom is capped at twice native density rather than magnifying it indefinitely.

The source was originally produced using the built-in image generation tool. Its exact prompt is retained below for provenance. No reference-site artwork was used as input.

## city-overview

Input 1: the corresponding original open-data composition guide. Input 2: the earlier historic-center illustration, used for style only (retained in git history). Final source: `assets/illustrations/city-overview.webp`.

```text
Use case: style-transfer. Asset: a geographically registered, fixed-angle illustrated map tile for an interactive atlas of Edirne, Turkey. Image 1 is the ONLY composition and geography source to edit. Image 2 is ONLY the style reference: match its rich natural colors, highly detailed architectural miniature illustration, lighting, water and foliage rendering. NEVER copy the buildings, landmarks, river shape or layout of Image 2 into Image 1. Preserve Image 1's EXACT frame, projection, orthographic isometric camera, road centerlines and intersections, river bank positions and widths, bridge positions, building footprints and heights, fields, gardens and landmark locations. Do not crop, zoom, recenter, rotate, alter geography, add streets, add rivers or move buildings. Retain empty land, fields and sparse areas rather than filling them with a city. Render edge to edge in the same 16:9 landscape rectangle. Transform simple polygons into a premium, believable illustrated aerial miniature: red terracotta roof tiles, weathered pale plaster and stone, tiny facade windows, natural building variation, soft ambient occlusion, finely cast shadows, lush textured round tree canopies, textured green farmland, subdued paved roads, and realistic blue-teal water with gentle fine ripples. Architectural depth should feel tangible, with finely painted photographic material detail; not flat shapes, not blocky game graphics, not a satellite photo. Sharp throughout, no blur or depth of field. Consistent daylight from upper left and restrained natural colors exactly matching Image 2. NO text, labels, UI, map pins, legends, compass, borders or watermarks. High-resolution 3840x2160 output.
This is the whole-city overview. Keep the city much smaller in scale exactly as in Image 1, with the same overall boundaries and all the surrounding open areas. Do not zoom in on any particular district. Preserve the broad, sparse exterior margins as subdued textured empty ground.
```

