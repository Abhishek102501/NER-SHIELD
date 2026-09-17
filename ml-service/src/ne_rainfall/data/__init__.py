"""Data sources for the North East India rainfall pipeline.

The Mumbai project was handed four spreadsheets on Google Drive.  Reproducing
it for another region means the acquisition step has to be code, not a set of
file IDs, so each source here is a small client behind one interface
(:class:`ne_rainfall.data.base.DataSource`).

Availability, licence and caveats for every source: ``docs/DATA_SOURCES.md``.
"""

from ne_rainfall.data.base import DataSource, SourceUnavailable, get_source
from ne_rainfall.data.open_meteo import OpenMeteoArchive, OpenMeteoGFS
from ne_rainfall.data.nasa_power import NasaPower
from ne_rainfall.data.imd import IMDGridded
from ne_rainfall.data.data_gov_in import DataGovIn
from ne_rainfall.data.india_wris import IndiaWRIS

__all__ = [
    "DataSource",
    "SourceUnavailable",
    "get_source",
    "OpenMeteoArchive",
    "OpenMeteoGFS",
    "NasaPower",
    "IMDGridded",
    "DataGovIn",
    "IndiaWRIS",
]
