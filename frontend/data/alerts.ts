import type { EscalationAlert } from "@/types";

/** DEMONSTRATION escalation alerts. Replaceable by `/api/v1/alerts`. */
export const ESCALATION_ALERTS: EscalationAlert[] = [
  {
    id: "alert-01",
    zone: "Meghalaya Sector 04",
    from: "high",
    to: "critical",
    cause: "Extreme rainfall accumulation (341 mm / 72h)",
    action: "Immediate field verification",
    timeAgo: "just now",
  },
  {
    id: "alert-02",
    zone: "NH-10 / Sikkim",
    from: "high",
    to: "critical",
    cause: "Pore-pressure spike on cut-slope sensors",
    action: "Corridor closure review",
    timeAgo: "4 min ago",
  },
  {
    id: "alert-03",
    zone: "Teesta Basin",
    from: "moderate",
    to: "high",
    cause: "Upstream discharge above forecast band",
    action: "Advise low-lying settlements",
    timeAgo: "12 min ago",
  },
];
