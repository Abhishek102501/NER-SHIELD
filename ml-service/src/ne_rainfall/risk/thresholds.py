"""IMD rainfall warning categories.

These are the India Meteorological Department's operational 24-hour rainfall
classes.  Using them rather than arbitrary cut-offs means the model's output
maps directly onto the language a state disaster management authority already
issues warnings in.

    no rain            0.0
    very light         0.1  -   2.4 mm
    light              2.5  -  15.5 mm
    moderate          15.6  -  64.4 mm
    heavy             64.5  - 115.5 mm
    very heavy       115.6  - 204.4 mm
    extremely heavy  >= 204.5 mm

**The horizon caveat, stated plainly.**  These are 24-hour categories.  A
12-step hourly forecast accumulates 12 hours, so comparing its total against
them under-states the daily category -- a 12-hour total of 60 mm reads as
"moderate" here while the day it belongs to may well finish "heavy".  The
engine therefore reports the accumulation window alongside every category, and
:func:`categorise` takes the window explicitly so nothing silently compares a
12-hour sum to a 24-hour class.  Scale to a daily-equivalent only if you have a
regional reason to; this module does not do it for you.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Sequence, Tuple

# Heavy / very heavy are the two DARPAN reports as P(>64mm) and P(>115mm).
HEAVY_MM = 64.5
VERY_HEAVY_MM = 115.6
EXTREMELY_HEAVY_MM = 204.5


@dataclass(frozen=True)
class IMDCategory:
    name: str
    lower_mm: float
    upper_mm: Optional[float]      # None = unbounded
    severity: int                  # 0..6, for ordering and the risk score

    def contains(self, mm: float) -> bool:
        if mm < self.lower_mm:
            return False
        return self.upper_mm is None or mm <= self.upper_mm

    def __str__(self) -> str:
        if self.upper_mm is None:
            return f"{self.name} (>= {self.lower_mm} mm)"
        return f"{self.name} ({self.lower_mm}-{self.upper_mm} mm)"


IMD_CATEGORIES: Tuple[IMDCategory, ...] = (
    IMDCategory("no rain", 0.0, 0.09, 0),
    IMDCategory("very light", 0.1, 2.4, 1),
    IMDCategory("light", 2.5, 15.5, 2),
    IMDCategory("moderate", 15.6, 64.4, 3),
    IMDCategory("heavy", HEAVY_MM, 115.5, 4),
    IMDCategory("very heavy", VERY_HEAVY_MM, 204.4, 5),
    IMDCategory("extremely heavy", EXTREMELY_HEAVY_MM, None, 6),
)

#: Thresholds worth fitting dedicated exceedance classifiers for.
WARNING_THRESHOLDS: Tuple[float, ...] = (2.5, 15.6, HEAVY_MM, VERY_HEAVY_MM)


def category_names() -> List[str]:
    return [c.name for c in IMD_CATEGORIES]


def categorise(total_mm: float, window_hours: float = 24.0) -> dict:
    """Classify an accumulation, carrying the window it was measured over.

    ``window_hours`` is not used to rescale -- it is recorded so a consumer can
    see that a 12-hour total was compared against 24-hour classes.
    """
    mm = max(0.0, float(total_mm))
    chosen = IMD_CATEGORIES[0]
    for cat in IMD_CATEGORIES:
        if cat.contains(mm):
            chosen = cat
            break
    else:  # above every bounded class
        chosen = IMD_CATEGORIES[-1]
    return {
        "category": chosen.name,
        "severity": chosen.severity,
        "total_mm": round(mm, 2),
        "window_hours": float(window_hours),
        "compared_against": "IMD 24-hour categories",
        "note": (
            None
            if abs(window_hours - 24.0) < 1e-6
            else f"accumulated over {window_hours:g} h, not 24 h -- category "
                 "is a lower bound on the day's class"
        ),
    }
