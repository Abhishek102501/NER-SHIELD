# Data sources

The Mumbai project was handed four spreadsheets on Google Drive: AWS rainfall,
AWS wind speed, a GFS forecast extract, and station coordinates. None of that
exists for the North East, so the acquisition step had to become code.

This document records what each source actually provides, whether it is
reachable, and what it costs you in accuracy.

---

## Summary

| key | what | resolution | key needed | verified reachable | role |
|---|---|---|---|---|---|
| `era5` | ERA5 reanalysis (Open-Meteo archive) | hourly, 1940– | no | **yes** | default observed rainfall + wind |
| `nasa_power` | NASA POWER (MERRA-2/GEOS), NASA LaRC | hourly, 1981– | no | **yes** | independent observed alternative |
| `gfs` | NOAA GFS 0.25° (Open-Meteo forecast) | hourly, −92 d…+16 d | no | **yes** | live NWP block for inference |
| `gfs_archive` | Open-Meteo historical forecast archive (`gfs_seamless`) | hourly, 2021– | no | **yes** | NWP block for training |
| `imd_gridded` | IMD Pune 0.25° gauge-based gridded rainfall | **daily**, 1901– | no | **no** (see below) | gauge reference / bias correction |
| `data_gov_in` | data.gov.in OGD platform | varies | yes (free) | **yes** (catalogue API) | station & subdivision records |
| `india_wris` | India-WRIS, Ministry of Jal Shakti | daily | no | **no** (see below) | basin-wise gauge records |

"Verified reachable" means a request was actually issued from a developer
machine during this port and returned usable data. Run the check yourself:

```bash
python -m ne_rainfall.cli sources --check
```

---

## The honest caveat about IMD and India-WRIS

`imdpune.gov.in` and `indiawris.gov.in` **did not respond** during this port —
connections timed out rather than returning an error. This is a well-known
behaviour: both frequently refuse traffic from non-Indian IP ranges and from
cloud providers. It is not evidence the data is gone.

This matters because IMD gridded rainfall is the *authoritative* Indian
government rainfall product, and any result you intend to publish should be
validated against it. The pipeline therefore treats it as opt-in rather than
pretending it works:

* `IMDGridded` prefers a locally downloaded NetCDF and only then tries the
  network;
* `IMDGridded.download_hint()` prints the exact manual steps;
* nothing in the default path depends on it, so a fresh clone still builds.

To use it, from an Indian network or via a mirror:

```bash
pip install imdlib
python -c "import imdlib; imdlib.get_data('rain', 2015, 2023, fn_format='yearwise', file_dir='data/raw')"
```

or download year files by hand from
<https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html> into
`data/raw/imd/` (named `2015.nc`, `2016.nc`, …).

**IMD gridded rainfall is daily.** It cannot drive an hourly nowcast on its
own. Its two legitimate roles here are bias-correcting the sub-daily
reanalysis to gauge-based daily totals, and validating seasonal climatology.

---

## Why ERA5 is the default, and what it costs

ERA5 is reanalysis, not observation. For the North East that is a real
trade-off, and it should be stated plainly rather than buried:

* **It under-represents extreme orographic peaks.** The Meghalaya plateau
  (Mawsynram, Sohra) produces some of the highest rainfall on Earth through a
  mechanism — moisture-laden Bay of Bengal air forced up a steep scarp — that a
  ~31 km reanalysis grid cell smooths out.

  **This was measured, not assumed.** A June–July 2023 build over the 37
  stations gives:

  | station | ERA5 Jun+Jul 2023 | rank of 37 | IMD Jun+Jul normal (approx.) |
  |---|---|---|---|
  | Mawsynram | 1449 mm | 7th | ~5000–6000 mm |
  | Sohra (Cherrapunji) | 1448 mm | 8th | ~4500–5500 mm |
  | Bongaigaon | 2266 mm | 1st | — |

  Reproduce it with `python -m ne_rainfall.cli build-data --start 2023-06-01
  --end 2023-07-31`. A single year is not a climatology and 2023 was not an
  average monsoon, but a 3–4× shortfall is far outside interannual variability,
  and the plateau stations ranking 7th and 8th rather than 1st and 2nd is the
  signature of grid-scale smoothing. Brahmaputra-valley stations, where
  rainfall is less sharply orographic, look plausible against their normals.

  **Practical consequence:** do not trust absolute magnitudes at Mawsynram,
  Sohra, Shillong or Jowai without bias correction, and do not publish extreme
  -event skill for those stations from an uncorrected ERA5 build.
* **It is spatially and temporally complete.** No missing gauges, no dead
  sensors, no station relocations. That completeness is exactly why it is
  usable for training a sequence model, where a gap corrupts a whole window.

The pipeline's answer is not to pretend the problem away: build on ERA5 for
completeness, then quantile-map to IMD gauge-based daily totals where you can
get them. `scripts/bias_correct.py` does this. Stations where the correction
factor is large are the stations whose forecasts you should trust least.

An independent second opinion is one flag away:

```yaml
data:
  sources:
    observed: nasa_power   # instead of era5
```

If ERA5 and NASA POWER disagree sharply at a station, that station's data is
worth inspecting before it goes into training.

---

## Historical NWP

The live `gfs` endpoint reaches ~92 days into the past. A multi-year training
NWP block needs `gfs_archive` (Open-Meteo's historical **forecast** archive,
which stores what the model actually predicted at the time, rather than what
happened). `build_dataset` switches to it automatically and records the
substitution in the dataset manifest.

Coverage there starts around 2021. If you need NWP features back to 2015, the
options are NOAA NOMADS/AWS GFS reanalysis archives (large, and extraction is a
project of its own) or accepting a shorter NWP-bearing training period. A
pragmatic middle path, and what the default config does, is to train on the
full observed record and let the NWP block be zero-filled before 2021 — the
model learns to lean on it only where it exists.

---

## data.gov.in

Resource IDs change when datasets are revised, so none is hard-coded. Find a
live one:

```bash
python -m ne_rainfall.cli search-ogd "rainfall" --limit 20
```

Get a free key at <https://data.gov.in/user/register> and export it:

```bash
export DATA_GOV_IN_API_KEY=your_key_here
```

The platform's published sample key is the default and works for light use.

---

## Attribution

If you publish on this, cite what you used:

* **ERA5** — Hersbach et al., Copernicus Climate Change Service (C3S).
* **Open-Meteo** — CC-BY-4.0.
* **NOAA GFS** — public domain, NOAA/NCEP.
* **NASA POWER** — NASA Langley Research Center, POWER Project.
* **IMD gridded rainfall** — Pai et al. (2014), India Meteorological Department.
* **data.gov.in / India-WRIS** — Government of India, under the National Data
  Sharing and Accessibility Policy.
