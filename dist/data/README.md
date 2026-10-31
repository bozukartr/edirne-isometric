# Map data, provenance, and interpretation

## OpenStreetMap

- **© OpenStreetMap contributors**, downloaded 2026-10-31 using the public OSM map API.
- License: **Open Database License (ODbL) 1.0**, https://opendatacommons.org/licenses/odbl/1-0/
- Attribution: https://www.openstreetmap.org/copyright
- WGS84 bounds: west 26.511, south 41.646, east 26.595, north 41.700.
- Local projection origin: 26.555 E, 41.676 N.
- 2,904 original building footprints, plus streets, waterways, water polygons, green spaces, and land-use areas.

The OSM compiler joins available multipolygon outer rings, clips to the stated bounds, and rounds local coordinates to 0.1 m. Generic courtyard holes are simplified; major landmark courtyards are illustrated separately.

## Microsoft building footprints

- Source: **Microsoft GlobalMLBuildingFootprints**, 2026-08-13 snapshot.
- Source documentation: https://github.com/microsoft/GlobalMLBuildingFootprints
- Index: https://bfppub.blob.core.windows.net/%24web/2026-08-13/dataset-links.csv
- Partition: Turkey, quadkey **120322321**.
- Original license: **CDLA Permissive 2.0**; included as `CDLA-Permissive-2.0.txt`.
- 13,659 additional footprints remain after clipping, confidence filtering, size filtering, and overlap filtering against OSM buildings.

The source contains machine-detected footprints, rather than surveyed cadastral records. Outlines can have errors or omissions. Buildings with confidence below 0.7 are excluded. An additional footprint is skipped when its bounding-box overlap exceeds 35% of the smaller bounding-box area of an OSM building. OSM geometry is retained in preference to overlapping machine-detected footprints.

The combined derivative database in `map.js` contains **16,563 buildings** and is distributed under **ODbL 1.0**, with the Microsoft source notice and original CDLA license retained. The browser does not download `map.js`; it is used to prepare the offline composition guides.

## Illustrated map images

The source geometry is projected at one fixed isometric angle. Five original scene images were artistically restyled using built-in image generation, then packaged as local WebP map tiles. All 12 curated places fall within a detailed illustration region. Source illustrations and geographic rectangles are committed in `assets/illustrations/`; `scripts/build-guides.cjs` recreates the composition guides and `scripts/build-illustrated-atlas.cjs` packages the final images.

Road and river layouts follow the source composition. Fine registration, facades, vegetation, roof textures, and architectural details are generative interpretations. Some building heights and simplified landmark models are estimates. The map is for illustrated exploration, not surveying, measurement, or address navigation. The source footprint count describes the input database rather than an exact count of visible generated structures.

No satellite imagery or reference-site artwork is bundled. Map images, gallery thumbnails, and the minimap all come from the original Edirne illustrations. The application requests no third-party map service.

## Landmarks

Coordinates were checked against OSM geometry and the Edirne Provincial Directorate of Culture and Tourism's place directory. Inconsistent directory coordinates (notably Eski Cami) were resolved using mapped geometry and corroborating coordinates. Descriptions are original Turkish summaries.

- Directory: https://edirne.ktb.gov.tr/TR-289350/instagram-noktalarimiz.html
- Selimiye: https://edirne.ktb.gov.tr/TR-76557/selimiye-camii.html
- Eski Cami: https://edirne.ktb.gov.tr/TR-110703/eski-cami.html
- Üç Şerefeli: https://edirne.ktb.gov.tr/TR-76561/uc-serefeli-camii.html
- Bridges: https://edirne.ktb.gov.tr/Eklenti/10181%2Cturkce-brosur.pdf?0=
- II. Bayezid Health Museum: https://saglikmuzesi.trakya.edu.tr/rehber/rehber.html
- Karaağaç station: https://edirne.ktb.gov.tr/TR-110701/karaagac-eski-tren-gari.html
- Synagogue: https://edirne.ktb.gov.tr/TR-85353/sinagog.html
- Sarayiçi: https://edirne.ktb.gov.tr/tr-90121/edirne-sarayi.html

## Refresh and rebuild

1. `python3 scripts/prepare-data.py` — refresh OSM-only data.
2. `python3 scripts/import-microsoft-buildings.py` — merge the pinned Microsoft extract.
3. `npm install` then `npm run guides` — render updated composition guides.
4. Redraw/review changed illustrated regions against those guides.
5. `npm run atlas` — package the committed illustrations into local tiles and thumbnails.
6. `npm run pages` — update the root HTML entry.

Ordinary use and deployment need no source downloads, generation call, or build step.

## Active v5 illustration

All published images now come from one whole-city master; independent regional redraws were removed because their geography did not align. This restores visual continuity between tiles, zoom levels and cards. It does not validate the generated master against real-world geography. Native resolution is 1672 × 941; there are five tiles and no generated higher-detail levels.
