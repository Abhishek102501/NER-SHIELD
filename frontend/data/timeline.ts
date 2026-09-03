import type { Severity, TimeRangeOption, TimelineEvent, TimelinePoint } from "@/types";

/**
 * DEMONSTRATION risk timeline data.
 *
 * One master series (`MASTER_SERIES`) spans the full observable window — 7 days of
 * history plus a fixed 24h forecast — and every time-range selection is a slice of it,
 * so there is a single source of truth for the chart, the summary statistics and the
 * event markers (no duplicated datasets per range).
 */

export const TIME_RANGES: TimeRangeOption[] = [
  { id: "now", label: "NOW", hours: 6 },
  { id: "6h", label: "6H", hours: 6 },
  { id: "12h", label: "12H", hours: 12 },
  { id: "24h", label: "24H", hours: 24 },
  { id: "48h", label: "48H", hours: 48 },
  { id: "7d", label: "7D", hours: 168 },
];

export const DEFAULT_RANGE_ID = "6h";
const FORECAST_HOURS = 24;
const OBSERVED_HOURS = 168;

/** Risk-scale bands shown on the chart and used to color the line/fill/markers. */
export const RISK_BANDS: { band: Severity; label: string; min: number; max: number }[] = [
  { band: "critical", label: "Critical", min: 90, max: 100 },
  { band: "high", label: "High", min: 70, max: 89 },
  { band: "moderate", label: "Medium", min: 40, max: 69 },
  { band: "low", label: "Low", min: 0, max: 39 },
];

export function riskBand(value: number): Severity {
  if (value >= 90) return "critical";
  if (value >= 70) return "high";
  if (value >= 40) return "moderate";
  return "low";
}

/** Deterministic pseudo-curve — a pure function of the hour offset, so it renders
 * identically on the server and the client (no `Math.random`, no wall-clock reads). */
function baseRisk(h: number): number {
  const drift = 56 + Math.sin(h / 55) * 13;
  const daily = Math.sin((h / 24) * Math.PI * 2 - 1.1) * 9;
  const micro = Math.sin(h * 0.9) * 2.5;
  return drift + daily + micro;
}

interface EventSeed {
  id: string;
  hourOffset: number;
  title: string;
  category: string;
  severity: Severity;
  time: string;
  entity: string;
  location?: string;
  status?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  /** How far this event pushes the underlying curve at its point (+/-). */
  bump: number;
}

const EVENT_SEEDS: EventSeed[] = [
  {
    id: "evt-potential-threat",
    hourOffset: -4,
    title: "Potential Threat",
    category: "Behavioral Anomaly",
    severity: "moderate",
    time: "10:32 PM",
    entity: "Network",
    location: "Imphal, Manipur",
    status: "Monitoring",
    description: "Elevated outbound signal pattern flagged for continued observation.",
    latitude: 24.817,
    longitude: 93.9368,
    bump: 10,
  },
  {
    id: "evt-pii-exposure",
    hourOffset: -9,
    title: "PII Exposure Detected",
    category: "Data Exposure",
    severity: "critical",
    time: "10:28 AM",
    entity: "Document",
    location: "New Delhi, India",
    status: "Active Investigation",
    description: "Potential sensitive entity exposure detected in outbound traffic logs.",
    latitude: 28.6139,
    longitude: 77.209,
    bump: 26,
  },
  {
    id: "evt-data-transfer",
    hourOffset: -18,
    title: "Unusual Data Transfer",
    category: "Network Activity",
    severity: "moderate",
    time: "06:42 AM",
    entity: "IP Address",
    location: "Guwahati, Assam",
    status: "Monitoring",
    description: "Port-scanning behaviour observed against a regional relay node.",
    latitude: 26.1445,
    longitude: 91.7362,
    bump: 12,
  },
  {
    id: "evt-entity-correlation",
    hourOffset: -30,
    title: "Entity Correlation",
    category: "Intelligence",
    severity: "low",
    time: "02:17 PM",
    entity: "Person",
    location: "Aizawl, Mizoram",
    status: "Reviewed",
    description: "Cross-referenced identity match confirmed against known field roster.",
    latitude: 23.7271,
    longitude: 92.7176,
    bump: -12,
  },
  {
    id: "evt-suspicious-login",
    hourOffset: -90,
    title: "Suspicious Login Pattern",
    category: "Access Control",
    severity: "moderate",
    time: "02:15 AM",
    entity: "Person",
    location: "Shillong, Meghalaya",
    status: "Monitoring",
    description: "Repeated failed authentication against a field-office credential set.",
    latitude: 25.5788,
    longitude: 91.8933,
    bump: 11,
  },
  {
    id: "evt-policy-violation",
    hourOffset: -140,
    title: "Policy Violation",
    category: "Compliance",
    severity: "high",
    time: "07:53 PM",
    entity: "Organization",
    location: "Kohima, Nagaland",
    status: "Active Investigation",
    description: "Vendor access pattern breached data-handling policy thresholds.",
    latitude: 25.6751,
    longitude: 94.1086,
    bump: 18,
  },
];

export const TIMELINE_EVENTS: TimelineEvent[] = EVENT_SEEDS.map((e) => ({
  id: e.id,
  hourOffset: e.hourOffset,
  title: e.title,
  category: e.category,
  severity: e.severity,
  time: e.time,
  entity: e.entity,
  location: e.location,
  status: e.status,
  description: e.description,
  latitude: e.latitude,
  longitude: e.longitude,
}));

/** Events that carry real coordinates — the only ones the map may ever plot. */
export function mappableTimelineEvents(events: TimelineEvent[]): TimelineEvent[] {
  return events.filter(
    (e) => typeof e.latitude === "number" && typeof e.longitude === "number",
  );
}

/** Anchor offsets: coarser far in the past, denser near "now" and through the forecast. */
function buildOffsets(): number[] {
  const offsets = new Set<number>();
  for (let h = -OBSERVED_HOURS; h <= -48; h += 8) offsets.add(h);
  for (let h = -48; h <= -12; h += 4) offsets.add(h);
  for (let h = -12; h <= 0; h += 2) offsets.add(h);
  for (let h = 0; h <= FORECAST_HOURS; h += 3) offsets.add(h);
  for (const seed of EVENT_SEEDS) offsets.add(seed.hourOffset);
  return Array.from(offsets).sort((a, b) => a - b);
}

const BUMP_SPREAD = 3.5; // hours over which an event's influence decays

function bumpAt(h: number): number {
  let total = 0;
  for (const seed of EVENT_SEEDS) {
    const d = Math.abs(h - seed.hourOffset);
    if (d <= BUMP_SPREAD) {
      total += seed.bump * (1 - d / BUMP_SPREAD);
    }
  }
  return total;
}

export const MASTER_SERIES: TimelinePoint[] = buildOffsets().map((h) => {
  const raw = baseRisk(h) + bumpAt(h);
  const risk = Math.round(Math.max(4, Math.min(99, raw)));
  return {
    id: `t${h >= 0 ? "+" : ""}${h}`,
    label: formatHourOffset(h),
    risk,
    hourOffset: h,
    now: h === 0,
    forecast: h > 0,
  };
});

export function formatHourOffset(h: number): string {
  if (h === 0) return "NOW";
  const abs = Math.abs(h);
  if (abs < 48) return `${h > 0 ? "+" : "-"}${abs}H`;
  const days = Math.round(abs / 24);
  return `${h > 0 ? "+" : "-"}${days}D`;
}

/** Slice the master series to a range's observed lookback + the fixed forecast horizon. */
export function seriesForRange(hoursBack: number): TimelinePoint[] {
  return MASTER_SERIES.filter((p) => p.hourOffset >= -hoursBack);
}

/** Events visible within a range's observed lookback window. */
export function eventsForRange(hoursBack: number): TimelineEvent[] {
  return TIMELINE_EVENTS.filter((e) => e.hourOffset >= -hoursBack).sort(
    (a, b) => a.hourOffset - b.hourOffset,
  );
}

export interface TimelineSummary {
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
}

/** Summary counts derived from the same event data the chart plots — never duplicated. */
export function summarizeEvents(events: TimelineEvent[]): TimelineSummary {
  return events.reduce(
    (acc, e) => {
      acc.total += 1;
      acc[e.severity] += 1;
      return acc;
    },
    { total: 0, critical: 0, high: 0, moderate: 0, low: 0 } as TimelineSummary,
  );
}

/**
 * Summary counts derived from the observed risk readings themselves (banded by
 * `riskBand`), rather than the handful of named markers — this is what the summary
 * strip shows, so it scales meaningfully with the selected time range using the exact
 * same series the chart renders.
 */
export function summarizeSeries(points: TimelinePoint[]): TimelineSummary {
  return points.reduce(
    (acc, p) => {
      acc.total += 1;
      acc[riskBand(p.risk)] += 1;
      return acc;
    },
    { total: 0, critical: 0, high: 0, moderate: 0, low: 0 } as TimelineSummary,
  );
}

/** Observed-only samples for a range (excludes the forecast horizon). */
export function observedForRange(hoursBack: number): TimelinePoint[] {
  return MASTER_SERIES.filter((p) => p.hourOffset >= -hoursBack && p.hourOffset <= 0);
}

/** The equal-length window immediately preceding a range — for "vs previous period". */
export function previousObservedWindow(hoursBack: number): TimelinePoint[] {
  return MASTER_SERIES.filter(
    (p) => p.hourOffset >= -hoursBack * 2 && p.hourOffset < -hoursBack,
  );
}

/** Percent change of `current` vs `previous`; `null` when there's no previous baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// Backward-compatible export: the full history+forecast series at the default range.
export const RISK_TIMELINE: TimelinePoint[] = seriesForRange(
  TIME_RANGES.find((r) => r.id === DEFAULT_RANGE_ID)!.hours,
);
