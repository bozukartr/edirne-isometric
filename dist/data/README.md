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

The combined derivative database in `map.js` contains **16,563 buildings** and is distributed under **ODbL 1.0**, with the Microsoft source notice and its original CDLA license retained. The browser does not download `map.js`; the offline renderer uses it to prepare the published WebP map pyramid.

## Interpretation

Building heights come from source tags where available; the remainder are deterministic estimates. Vertical scale is emphasized. Roof materials, colors, facade windows, shadows, and tree positions are illustrative. Trees are seeded within mapped green polygons. River centerlines are sourced, but widths are stylized when no closed water polygon is available. Terrain is flat. Custom landmark models are architectural interpretations, not surveyed 3D models.

The rendered images in `../atlas/` are produced from these sources by the original renderer in `scripts/lib/render-scene.cjs`. They contain no copied imagery from Isometric Istanbul or Isometric NYC.

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
3. `npm install` then `npm run atlas` — render map tiles and thumbnails offline.
4. `npm run pages` — update the root HTML entry.

The existing source database and all rendered tiles are committed, so ordinary use and deployment need no data downloads or image-building step.
