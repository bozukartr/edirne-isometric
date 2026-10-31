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

## Satellite imagery and geographic fallback

The primary map requests **Esri World Imagery** directly at runtime. Attribution: Esri, Vantor, Earthstar Geographics, and the GIS User Community. Source metadata and terms: https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9 . No provider source rasters or offline satellite tile cache are bundled. `docs/preview.jpg` is an attributed interface screenshot.

Satellite pixels, place coordinates and the minimap share one exact Web Mercator-to-isometric transform. The old AI-generated city images were removed because they changed the geography. There is no generative redraw, inferred building-height shift or synthetic architectural detail in the primary map.

`map.js` supplies the bundled schematic fallback when imagery is unavailable. The builder converts its original equirectangular local coordinates to Web Mercator before projection. It draws source roads, water and footprint polygons at ground level; it does not add facade models, roofs, terrain or estimated heights. Missing areas and schematic widths retain the source data's limitations. Failures are visibly identified in the viewer and may be retried.

Provider image acquisition dates, resolution and ground-position errors are not controlled by this project. This is a fixed-angle view of actual imagery, not a measured 3D reconstruction or surveying/navigation product. The 16,563 footprint count refers only to the fallback input dataset.

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
3. `npm install` then `npm run atlas` — render source geometry to local fallback overview/thumbnails.
4. `npm run pages` — update the GitHub Pages root entry.
5. `npm run check` — verify projection, registration, data, loading and static entries.

Ordinary deployment needs no source downloads, image generation, external API key or build step. Actual satellite display needs internet access to the provider service.
