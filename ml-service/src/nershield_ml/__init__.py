"""NER-SHIELD ML service package.

On Windows, a system-wide PostGIS install commonly sets PROJ_LIB/GDAL_DATA to
its own (often older/incompatible) PROJ database, which breaks rasterio/
pyproj even inside a clean virtualenv — rasterio then fails with
"CRSError: The EPSG code is unknown" for plain codes like EPSG:4326. Rasterio
ships a PROJ database matching the version it was built against, so prefer
that one unless the environment has been deliberately pointed elsewhere. This
must run before rasterio/pyproj are imported anywhere in the process.
"""

from __future__ import annotations

import os


def _prefer_bundled_proj_data() -> None:
    current = os.environ.get("PROJ_LIB", "")
    looks_foreign = "postgis" in current.lower() or "postgresql" in current.lower()
    if not looks_foreign:
        return

    # Let each library fall back to the PROJ database it ships internally
    # instead of the (schema-incompatible) one PostGIS put on PATH.
    for var in ("PROJ_LIB", "PROJ_DATA", "GDAL_DATA"):
        os.environ.pop(var, None)


_prefer_bundled_proj_data()
