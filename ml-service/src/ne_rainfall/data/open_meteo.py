"""Open-Meteo clients: ERA5 reanalysis archive and NOAA GFS forecast.

Both endpoints are free, keyless and rate-limited rather than gated, which
makes them the default so ``make data`` works on a fresh clone.  ERA5 supplies
the observed rainfall/wind blocks; GFS supplies the NWP block that replaces
Mumbai's ``data_X_prec_15_LSTM_IST.xlsx``.

Licence: Open-Meteo data is CC-BY-4.0; ERA5 is Copernicus, GFS is NOAA public
domain.  Attribution belongs in any publication built on this.
"""

from __future__ import annotations

from typing import Dict

import pandas as pd

from ne_rainfall.data.base import DataSource, SourceUnavailable, register

# Canonical variable name -> Open-Meteo hourly variable.
_ERA5_VARS = {
    "rainfall": "precipitation",
    "wind_speed": "wind_speed_10m",
    "temperature": "temperature_2m",
    "humidity": "relative_humidity_2m",
    "pressure": "surface_pressure",
    "cape": "cape",
}

_GFS_VARS = {
    "nwp_precip": "precipitation",
    "nwp_wind": "wind_speed_10m",
    "nwp_cape": "cape",
}


def _parse_hourly(payload: dict, wanted: Dict[str, str], source: str) -> pd.DataFrame:
    hourly = payload.get("hourly")
    if not hourly or "time" in hourly and not hourly["time"]:
        raise SourceUnavailable(f"{source}: response carried no hourly block")
    idx = pd.to_datetime(hourly["time"])
    out = pd.DataFrame(index=idx)
    for canonical, provider_name in wanted.items():
        if provider_name not in hourly:
            raise SourceUnavailable(
                f"{source}: variable {provider_name!r} missing from response"
            )
        out[canonical] = pd.to_numeric(hourly[provider_name], errors="coerce")
    out.index.name = "time"
    return out


@register
class OpenMeteoArchive(DataSource):
    """ERA5 / ERA5-Land hourly reanalysis, 1940-present.

    Reanalysis, not gauge observation.  For the North East that is a real
    trade-off: ERA5 under-represents the extreme orographic peaks of the
    Meghalaya plateau.  ``IMDGridded`` is provided as the gauge-based
    cross-check and ``scripts/bias_correct.py`` applies a quantile mapping from
    it; see docs/DATA_SOURCES.md.
    """

    key = "era5"
    provenance = "ERA5 hourly reanalysis via Open-Meteo archive API (CC-BY-4.0)"
    BASE = "https://archive-api.open-meteo.com/v1/archive"

    def fetch_point(self, lat, lon, start, end, variables, freq) -> pd.DataFrame:
        wanted = {k: _ERA5_VARS[k] for k in variables if k in _ERA5_VARS}
        if not wanted:
            raise ValueError(f"era5 supports {sorted(_ERA5_VARS)}, got {list(variables)}")
        url = self.build_url(
            self.BASE,
            {
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "start_date": start,
                "end_date": end,
                "hourly": ",".join(wanted.values()),
                "timezone": "Asia/Kolkata",
                "precipitation_unit": "mm",
                "wind_speed_unit": "ms",
            },
        )
        df = _parse_hourly(self.get_json(url), wanted, self.key)
        return self._to_freq(df, freq)

    @staticmethod
    def _to_freq(df: pd.DataFrame, freq: str) -> pd.DataFrame:
        """Resample the hourly source onto the modelling step.

        Rainfall is a flux, so upsampling to 15 min divides the hourly accumulation
        evenly rather than forward-filling it -- forward-fill would multiply the
        region's rainfall by four.  Wind is a state and is interpolated.
        """
        step = pd.tseries.frequencies.to_offset(freq)
        hour = pd.tseries.frequencies.to_offset("1h")
        if step == hour:
            return df
        if step < hour:
            ratio = pd.Timedelta(hour) / pd.Timedelta(step)
            up = df.resample(freq).ffill()
            for col in up.columns:
                if col.startswith(("rainfall", "nwp_precip")):
                    up[col] = up[col] / ratio
                else:
                    up[col] = df[col].resample(freq).interpolate("linear")
            return up
        agg = {c: ("sum" if c.startswith(("rainfall", "nwp_precip")) else "mean")
               for c in df.columns}
        return df.resample(freq).agg(agg)


@register
class OpenMeteoGFS(DataSource):
    """NOAA GFS 0.25 deg forecast -- the analogue of the Mumbai GFS block.

    ``past_days`` lets the same endpoint serve both live inference and a short
    rolling archive; for a multi-year training NWP block use
    ``OpenMeteoArchive`` with ``model=gfs_seamless`` or supply your own GFS
    extraction (see docs/DATA_SOURCES.md, "Historical NWP").
    """

    key = "gfs"
    provenance = "NOAA GFS 0.25deg via Open-Meteo forecast API (public domain)"
    BASE = "https://api.open-meteo.com/v1/gfs"

    def fetch_point(self, lat, lon, start, end, variables, freq) -> pd.DataFrame:
        wanted = {k: _GFS_VARS[k] for k in variables if k in _GFS_VARS}
        if not wanted:
            raise ValueError(f"gfs supports {sorted(_GFS_VARS)}, got {list(variables)}")
        url = self.build_url(
            self.BASE,
            {
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "hourly": ",".join(wanted.values()),
                "timezone": "Asia/Kolkata",
                "past_days": 92,          # endpoint maximum
                "forecast_days": 16,
                "precipitation_unit": "mm",
                "wind_speed_unit": "ms",
            },
        )
        df = _parse_hourly(self.get_json(url, use_cache=False), wanted, self.key)
        return OpenMeteoArchive._to_freq(df, freq)


@register
class OpenMeteoHistoricalNWP(OpenMeteoArchive):
    """Multi-year GFS-like precipitation for the NWP block.

    Open-Meteo's archive endpoint can serve a chosen NWP model rather than
    ERA5, which is how the training-period NWP block is built without
    re-deriving GFS archives from NOAA NOMADS by hand.
    """

    key = "gfs_archive"
    provenance = "Open-Meteo historical forecast archive (model=gfs_seamless)"
    BASE = "https://historical-forecast-api.open-meteo.com/v1/forecast"

    def fetch_point(self, lat, lon, start, end, variables, freq) -> pd.DataFrame:
        wanted = {k: _GFS_VARS.get(k, _ERA5_VARS.get(k)) for k in variables}
        wanted = {k: v for k, v in wanted.items() if v}
        url = self.build_url(
            self.BASE,
            {
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "start_date": start,
                "end_date": end,
                "hourly": ",".join(wanted.values()),
                "models": "gfs_seamless",
                "timezone": "Asia/Kolkata",
                "precipitation_unit": "mm",
                "wind_speed_unit": "ms",
            },
        )
        df = _parse_hourly(self.get_json(url), wanted, self.key)
        return self._to_freq(df, freq)
