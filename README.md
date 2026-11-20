# BAP Project Map

Public map of selected Bildsten Architecture & Planning projects, grouped by broad area.
Static site — no build step. Host on GitHub Pages (Settings → Pages → Deploy from branch → `main` / root).

## Files
- `index.html`, `style.css`, `app.js` — the app (Leaflet 1.9.4 + Esri basemaps, same as SB Parcel Explorer)
- `data/regions.geojson` — 7 areas from Census city/CDP boundaries (2023), clipped to the shoreline.
  Santa Barbara city is split at State St (East/West) and at Las Positas Rd / San Roque Rd / US‑101 (North).
  Summerland is part of Montecito; Toro Canyon is part of Carpinteria; the airport and Isla Vista are part of Goleta.
- `data/projects.json` — one record per project: id, title, type, year, region, image paths. No addresses or coordinates.
- `img/pXX/` — web-sized photos (max 1600 px) with all metadata removed (no EXIF/GPS/XMP), plus a 240 px `thumb.jpg`.

## Editing projects
- Change a title or type: edit `data/projects.json`.
- Place a project on the map: set its `"region"` to one of `sb-north`, `sb-west`, `sb-east`, `montecito`, `egv`, `goleta`, `carpinteria`, or `elsewhere`.
  Projects with `"region": null` are hidden on the public map.
- Review mode: add `?review=1` to the URL to see hidden projects under "Location to confirm".
- Share links: `#area/sb-east` opens an area; `#project/p07` opens a project gallery.

## Privacy rules
- Never add addresses, client names, or coordinates to this repo.
- New images must be resized and stripped of metadata before upload (re-saving from raw pixels does this).
- Use broad areas only; map zoom is capped at 16.
