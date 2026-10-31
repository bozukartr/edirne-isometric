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

The combined derivative database in `map.js` contains **16,563 buildings** and is distributed under **ODbL 1.0**, with the Microsoft source notice and its original CDLA license retained. The browser does not download `map.js`; the offline 3D compiler uses it to prepare the geometry in `../scene3d/`. Compiled geometry retains the source database licenses. The original v2 WebP pyramid remains as an unused archive.

## Interpretation

Building heights come from source tags where available; the remainder are deterministic estimates. Version 3 uses physical meter heights without the v2 vertical exaggeration. Facades and windows are procedural approximations. Three major mosques have simplified architectural models rather than surveyed geometry. Terrain is flat. Footprint dates and image capture dates can differ, and registration errors can produce visible mismatches.

## Live aerial imagery

Ground imagery, roof textures, thumbnails, and the minimap are fetched live from the public Esri World Imagery service. Attribution: **Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community**.

- Item and applicable terms: https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9
- Service: https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer

Imagery is third-party copyrighted material, not part of the open building database or the repository license. No satellite tiles or roof photos are bundled, bulk downloaded, or cached for offline use. Normal browser and in-memory texture caching is used while viewing the map. The README screenshot is a map representation with visible attribution. Availability, capture dates, and resolution depend on the provider. The imagery is capped at native zoom 18 because higher levels return unavailable-data placeholders in this area.

The older illustrative images in `../atlas/` were produced from open geometry by `scripts/lib/render-scene.cjs`; they contain no satellite or reference-site imagery and are not requested by the current application.

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
3. `npm install` then `npm run scene3d` — compile and quantize the 3D building mesh offline.
4. `npm run pages` — update the root HTML entry.

The source database, compiled building geometry, and vendored rendering engine are committed, so deployment needs no build step. The application streams satellite imagery from Esri while in use.
