"""NASA POWER hourly meteorology (NASA Langley Research Center).

A government-operated, keyless alternative to the ERA5 route, drawn from
MERRA-2 / GEOS.  Useful as an independent observed block: if the two disagree
badly at a station, that station's gauge history is worth checking before it
goes into training.
"""

from __future__ import annotations

from typing import Dict

import pandas as pd

from ne_rainfall.data.base import DataSource, SourceUnavailable, register

_POWER_VARS = {
    "rainfall": "PRECTOTCORR",
    "wind_speed": "WS10M",
    "temperature": "T2M",
    "humidity": "RH2M",
    "pressure": "PS",
}


@register
class NasaPower(DataSource):
    key = "nasa_power"
    provenance = "NASA POWER hourly (MERRA-2/GEOS), NASA LaRC -- free, no key"
    BASE = "https://power.larc.nasa.gov/api/temporal/hourly/point"

    #: POWER returns -999 for fill
    FILL = -999.0

    def fetch_point(self, lat, lon, start, end, variables, freq) -> pd.DataFrame:
        wanted = {k: _POWER_VARS[k] for k in variables if k in _POWER_VARS}
        if not wanted:
            raise ValueError(
                f"nasa_power supports {sorted(_POWER_VARS)}, got {list(variables)}"
            )
        url = self.build_url(
            self.BASE,
            {
                "parameters": ",".join(wanted.values()),
                "community": "AG",
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "start": start.replace("-", ""),
                "end": end.replace("-", ""),
                "format": "JSON",
                "time-standard": "LST",
            },
        )
        payload = self.get_json(url)
        try:
            params = payload["properties"]["parameter"]
        except (KeyError, TypeError) as exc:
            raise SourceUnavailable(f"nasa_power: unexpected payload shape") from exc

        frames: Dict[str, pd.Series] = {}
        for canonical, power_name in wanted.items():
            series = params.get(power_name)
            if series is None:
                raise SourceUnavailable(f"nasa_power: {power_name} missing")
            idx = pd.to_datetime(list(series.keys()), format="%Y%m%d%H")
            vals = pd.to_numeric(list(series.values()), errors="coerce")
            s = pd.Series(vals, index=idx)
            frames[canonical] = s.mask(s <= self.FILL)

        df = pd.DataFrame(frames).sort_index()
        df.index.name = "time"
        # POWER is hourly; reuse the archive resampler for other steps.
        from ne_rainfall.data.open_meteo import OpenMeteoArchive

        return OpenMeteoArchive._to_freq(df, freq)
