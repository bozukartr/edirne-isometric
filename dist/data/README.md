# Map data, provenance, and interpretation

## Geographic database

- Source: **© OpenStreetMap contributors**, downloaded 2026-10-31 using the public OSM map API.
- License: **Open Database License (ODbL) 1.0**, https://opendatacommons.org/licenses/odbl/1-0/
- Attribution and copyright information: https://www.openstreetmap.org/copyright
- Bounding box: west 26.511, south 41.646, east 26.595, north 41.700 (WGS84).
- Local projection origin: 26.555 E, 41.676 N.
- Included derivative: `map.js`, 2,904 building footprints and 7,516 total features.
- Reproduction: `python3 scripts/prepare-data.py` from the repository root; the script also accepts an OSM XML file.

The compiler selects roads, buildings, river centerlines, water polygons, green spaces, and land-use areas. It joins available multipolygon outer rings, clips geometry to the stated bounds, and rounds local meter coordinates to one decimal place. Inner multipolygon courtyards are represented by simplified solid roofs in the generic renderer. Custom landmark courtyards are illustrated separately.

This is a bounded offline snapshot. OSM omissions remain omissions. Building heights may be estimated and are vertically emphasized by the renderer. Tree locations are decorative, seeded inside mapped green polygons. Rivers use simplified widths (Meriç 150 m, Tunca 32 m) when only a centerline is available. Landmarks are original, simplified architectural interpretations. This is not a surveyed model, cadastral dataset, or navigation application.

## Curated landmarks

Coordinates were checked against the downloaded OSM geometry and Edirne Provincial Directorate of Culture and Tourism's place directory. Where the directory has an inconsistent coordinate (notably Eski Cami), mapped geometry and corroborating coordinates were preferred.

- Place directory: https://edirne.ktb.gov.tr/TR-289350/instagram-noktalarimiz.html
- Selimiye: https://edirne.ktb.gov.tr/TR-76557/selimiye-camii.html
- Eski Cami: https://edirne.ktb.gov.tr/TR-110703/eski-cami.html
- Üç Şerefeli: https://edirne.ktb.gov.tr/TR-76561/uc-serefeli-camii.html
- Bridges: https://edirne.ktb.gov.tr/Eklenti/10181%2Cturkce-brosur.pdf?0=
- II. Bayezid Health Museum: https://saglikmuzesi.trakya.edu.tr/rehber/rehber.html
- Karaağaç station: https://edirne.ktb.gov.tr/TR-110701/karaagac-eski-tren-gari.html
- Synagogue: https://edirne.ktb.gov.tr/TR-85353/sinagog.html
- Sarayiçi and Edirne Palace: https://edirne.ktb.gov.tr/tr-90121/edirne-sarayi.html

Place descriptions are original editorial summaries. References inform the descriptions; no site photography, map tiles, or image assets were copied.

## Inspiration and fonts

- https://isometric.nyc
- https://isometricistanbul.com
- Instrument Serif and DM Sans, optionally loaded from Google Fonts; each is distributed under the SIL Open Font License through Google Fonts. The repository does not bundle font files.

The inspiration sites' code and imagery are not included in this project.
