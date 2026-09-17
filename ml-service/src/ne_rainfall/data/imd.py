"""IMD Pune gauge-based gridded rainfall (0.25 deg, 1901-present).

This is the authoritative Indian government rainfall product and the right
reference for any published North East result.  Two caveats, both real:

1. It is DAILY.  It cannot drive an hourly nowcast on its own.  Its role here
   is (a) bias-correcting the sub-daily reanalysis block to gauge-based daily
   totals and (b) validating the seasonal climatology of whatever source you
   do train on.
2. ``imdpune.gov.in`` frequently refuses connections from outside India and
   from cloud IPs.  This client therefore prefers a locally downloaded file and
   only falls back to the network.  ``download_hint()`` prints exactly what to
   fetch by hand.

Manual route:  https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html
(one NetCDF per year), saved into ``data/raw/imd/``.
Python route:  ``pip install imdlib`` then
``imdlib.get_data('rain', 2015, 2023, fn_format='yearwise', file_dir='data/raw/imd')``.
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from ne_rainfall.data.base import DataSource, SourceUnavailable, register

IMD_GRID_PAGE = "https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html"
IMD_YEAR_URL = "https://www.imdpune.gov.in/cmpg/Griddata/RF25/{year}.nc"


@register
class IMDGridded(DataSource):
    key = "imd_gridded"
    provenance = "IMD Pune 0.25deg gauge-based gridded daily rainfall"
    requires_credentials = False  # free, but often needs a manual download

    def __init__(self, local_dir: str | Path = "data/raw/imd", **kwargs):
        super().__init__(**kwargs)
        self.local_dir = Path(local_dir)
        self.local_dir.mkdir(parents=True, exist_ok=True)

    # -- public --------------------------------------------------------------
    def available_years(self) -> List[int]:
        years = []
        for p in self.local_dir.glob("*.nc"):
            stem = p.stem
            if stem.isdigit():
                years.append(int(stem))
        return sorted(years)

    def download_hint(self) -> str:
        return (
            "IMD gridded rainfall could not be fetched automatically.\n"
            f"  1. Open {IMD_GRID_PAGE}\n"
            f"  2. Download one NetCDF per year into {self.local_dir}/ (e.g. 2020.nc)\n"
            "  or run:  pip install imdlib && python -c \"import imdlib;"
            f" imdlib.get_data('rain', 2015, 2023, fn_format='yearwise',"
            f" file_dir='{self.local_dir.parent}')\"\n"
            "IMD servers commonly refuse non-Indian and cloud IPs; a manual\n"
            "download from an Indian network, copied into that folder, works."
        )

    def fetch_point(self, lat, lon, start, end, variables, freq) -> pd.DataFrame:
        """Daily gauge-based rainfall at the grid cell containing (lat, lon).

        ``freq`` finer than daily is served by dividing the daily total evenly
        across the day.  That is a placeholder shape, not a nowcast signal --
        use it for bias correction, never as a model input on its own.
        """
        if "rainfall" not in variables:
            raise ValueError("imd_gridded provides 'rainfall' only")

        years = sorted({int(start[:4]), int(end[:4])})
        years = list(range(years[0], years[-1] + 1))
        have = set(self.available_years())
        missing = [y for y in years if y not in have]
        if missing:
            self._try_download(missing)
            have = set(self.available_years())
            still = [y for y in years if y not in have]
            if still:
                raise SourceUnavailable(
                    f"IMD years {still} unavailable.\n{self.download_hint()}"
                )

        daily = pd.concat(
            [self._read_year(y, lat, lon) for y in years if y in have]
        ).sort_index()
        daily = daily.loc[start:end]
        df = pd.DataFrame({"rainfall": daily})
        df.index.name = "time"

        step = pd.tseries.frequencies.to_offset(freq)
        day = pd.tseries.frequencies.to_offset("1d")
        if step < day:
            per_day = pd.Timedelta(day) / pd.Timedelta(step)
            df = df.resample(freq).ffill() / per_day
        return df

    # -- internals -----------------------------------------------------------
    def _try_download(self, years: List[int]) -> None:
        for y in years:
            url = IMD_YEAR_URL.format(year=y)
            target = self.local_dir / f"{y}.nc"
            try:
                import urllib.request

                from ne_rainfall.data.base import USER_AGENT

                req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=self.timeout) as r:
                    payload = r.read()
                if len(payload) < 10_000:
                    continue  # an error page, not a NetCDF
                target.write_bytes(payload)
            except Exception:
                continue  # handled by the caller, which raises with the hint

    def _read_year(self, year: int, lat: float, lon: float) -> pd.Series:
        try:
            import xarray as xr
        except ImportError as exc:
            raise SourceUnavailable(
                "reading IMD NetCDF needs xarray + netcdf4: "
                "pip install 'xarray[io]'"
            ) from exc

        path = self.local_dir / f"{year}.nc"
        ds = xr.open_dataset(path)
        var = next(
            (v for v in ("rf", "RAINFALL", "rain", "precip") if v in ds.variables),
            None,
        )
        if var is None:
            var = list(ds.data_vars)[0]
        lat_name = "LATITUDE" if "LATITUDE" in ds.coords else "lat"
        lon_name = "LONGITUDE" if "LONGITUDE" in ds.coords else "lon"
        sel = ds[var].sel({lat_name: lat, lon_name: lon}, method="nearest")
        s = sel.to_series()
        s.index = pd.to_datetime(s.index)
        ds.close()
        return s.mask(s < 0)
