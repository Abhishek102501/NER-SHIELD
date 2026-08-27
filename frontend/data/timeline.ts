import type { TimelinePoint } from "@/types";

/** DEMONSTRATION risk timeline — past readings + forward projection. */
export const RISK_TIMELINE: TimelinePoint[] = [
  { id: "t-6", label: "6H AGO", risk: 61 },
  { id: "t-4", label: "4H AGO", risk: 68 },
  { id: "t-2", label: "2H AGO", risk: 79 },
  { id: "t-0", label: "NOW", risk: 87, now: true },
  { id: "t+6", label: "+6H", risk: 90, forecast: true },
  { id: "t+12", label: "+12H", risk: 84, forecast: true },
  { id: "t+24", label: "+24H", risk: 72, forecast: true },
];

/** Index of the "NOW" point, used for the current-time indicator. */
export const TIMELINE_NOW_INDEX = RISK_TIMELINE.findIndex((p) => p.now);
