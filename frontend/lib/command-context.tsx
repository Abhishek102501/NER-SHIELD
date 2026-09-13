"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LAYER_STATE } from "@/data/layers";
import { INCIDENTS } from "@/data/incidents";
import { NOTIFICATIONS } from "@/data/region";
import { RESPONSE_UNITS } from "@/data/response";
import { RISK_TIMELINE } from "@/data/timeline";
import { DEMO_PERMISSIONS } from "@/lib/auth";
import { getIncidents } from "@/services/ops";
import type {
  AppNotification,
  AuditEvent,
  DemoSession,
  Incident,
  IncidentStatus,
  PermissionSet,
  Severity,
} from "@/types";

export type ModalKind = "simulation" | "report" | null;

export type MobileNav = "left" | "right" | null;

export interface LiveMetrics {
  activeAlerts: number;
  criticalZones: number;
  activeIncidents: number;
  fieldReports: number;
  rainfall: number;
  /** Increments each tick — drives subtle "live" pulses. */
  tick: number;
}

export interface CreateIncidentInput {
  severity: Severity;
  category: string;
  location: string;
  lngLat: [number, number];
  description: string;
  affectedArea?: string;
  source: string;
}

export interface SimulationParams {
  scenarioLabel: string;
  intensity: number;
  duration: number;
}

/** Everything a running "what-if" scenario changes — always labeled DEMO
 * SIMULATION in the UI, never presented as a live prediction. */
export interface SimulationResult {
  scenarioLabel: string;
  intensity: number;
  duration: number;
  projectedRisk: number;
  delta: number;
  rainfallDeltaMm: number;
  soilMoistureDeltaPct: number;
  appliedAt: string;
}

/** localStorage-persisted slice — the part of demo state that should survive
 * a refresh but is reset by "Reset Demo Data". Session lives in an httpOnly
 * cookie instead (see lib/auth.ts / proxy.ts), never in this blob. */
interface PersistedDemoState {
  incidents: Incident[];
  notifications: AppNotification[];
  auditLog: AuditEvent[];
  activeSimulation: SimulationResult | null;
  live: LiveMetrics;
}

const STORAGE_KEY = "ns-demo-state-v1";

const INITIAL_LIVE: LiveMetrics = {
  activeAlerts: 14,
  criticalZones: 3,
  activeIncidents: 7,
  fieldReports: 32,
  rainfall: 142,
  tick: 0,
};

function initialPersistedState(): PersistedDemoState {
  return {
    incidents: INCIDENTS,
    notifications: NOTIFICATIONS,
    auditLog: [],
    activeSimulation: null,
    live: INITIAL_LIVE,
  };
}

function loadPersistedState(): PersistedDemoState {
  if (typeof window === "undefined") return initialPersistedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialPersistedState();
    const parsed = JSON.parse(raw) as Partial<PersistedDemoState>;
    const fallback = initialPersistedState();
    return {
      incidents: parsed.incidents?.length ? parsed.incidents : fallback.incidents,
      notifications: parsed.notifications?.length ? parsed.notifications : fallback.notifications,
      auditLog: parsed.auditLog ?? fallback.auditLog,
      activeSimulation: parsed.activeSimulation ?? null,
      live: parsed.live ?? fallback.live,
    };
  } catch {
    return initialPersistedState();
  }
}

function nowTime(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

interface CommandState {
  // Session / auth (see lib/auth.ts, proxy.ts, app/api/auth/*)
  session: DemoSession | null;
  sessionLoading: boolean;
  permissions: PermissionSet;
  logout: () => Promise<void>;

  /** Periodically-updated demo telemetry (DEMO / SIMULATED). */
  live: LiveMetrics;

  // Desktop panel collapse (expanded ⇄ rail)
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  toggleLeftCollapsed: () => void;
  toggleRightCollapsed: () => void;

  // Mobile drawers (one at a time)
  mobileNav: MobileNav;
  openMobileNav: (side: Exclude<MobileNav, null>) => void;
  closeMobileNav: () => void;

  // Map layers
  layers: Record<string, boolean>;
  toggleLayer: (id: string) => void;
  layerPanelOpen: boolean;
  setLayerPanelOpen: (v: boolean) => void;

  // Notifications
  notificationsOpen: boolean;
  setNotificationsOpen: (v: boolean) => void;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Audit / activity log
  auditLog: AuditEvent[];

  // Modals
  activeModal: ModalKind;
  openModal: (m: Exclude<ModalKind, null>) => void;
  closeModal: () => void;

  // Dispatch modal (separate from activeModal — it targets a specific incident)
  dispatchTargetId: string | null;
  openDispatch: (incidentId: string) => void;
  closeDispatch: () => void;

  // Reset-demo confirmation
  resetConfirmOpen: boolean;
  openResetConfirm: () => void;
  closeResetConfirm: () => void;
  resetDemo: () => void;

  // Incidents (real backend, with an automatic demo fallback — see services/ops.ts)
  incidents: Incident[];
  createIncident: (input: CreateIncidentInput) => Incident;
  acknowledgeIncident: (id: string) => void;
  updateIncidentStatus: (id: string, status: IncidentStatus) => void;
  dispatchUnit: (id: string, unitId: string, priority: string, notes: string) => void;

  // Selection
  selectedIncidentId: string | null;
  selectIncident: (id: string | null) => void;
  selectedIncident: Incident | null;

  selectedTimelineId: string;
  selectTimeline: (id: string) => void;

  /** Currently selected intelligence event (shared between the map and the timeline). */
  selectedEventId: string | null;
  selectEvent: (id: string | null) => void;

  // Map placeholder zoom (drives the +/- controls)
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;

  // Simulation (DEMO SIMULATION — never a real prediction-service call)
  activeSimulation: SimulationResult | null;
  runSimulation: (params: SimulationParams) => SimulationResult;
  clearSimulation: () => void;
}

const Ctx = createContext<CommandState | null>(null);

const NOW_POINT = RISK_TIMELINE.find((p) => p.now) ?? RISK_TIMELINE[0];

export function CommandProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [session, setSession] = useState<DemoSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState<MobileNav>(null);
  const [layers, setLayers] = useState<Record<string, boolean>>({
    ...DEFAULT_LAYER_STATE,
  });
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [dispatchTargetId, setDispatchTargetId] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Persisted demo slice — hydrated from localStorage after mount so SSR and
  // first client paint match, then upgraded (matches the getIncidents() /
  // backend-fallback pattern services/ops.ts already uses elsewhere).
  const [incidents, setIncidents] = useState<Incident[]>(INCIDENTS);
  const [notifications, setNotifications] = useState<AppNotification[]>(NOTIFICATIONS);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<SimulationResult | null>(null);
  const [live, setLive] = useState<LiveMetrics>(INITIAL_LIVE);
  const hydrated = useRef(false);

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null,
  );
  const [selectedTimelineId, setSelectedTimelineId] = useState<string>(
    NOW_POINT.id,
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(7.5);

  const logActivity = useCallback((action: string, detail: string) => {
    setAuditLog((prev) => [
      { id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, time: nowTime(), actor: "Ops Command", action, detail },
      ...prev,
    ].slice(0, 100));
  }, []);

  // ---- Session bootstrap ----
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data: { session: DemoSession | null }) => {
        if (cancelled) return;
        setSession(data.session);
        if (data.session) logActivity("Login", "Demo session started.");
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setSessionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [logActivity]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    logActivity("Logout", "Session ended.");
    setSession(null);
    router.push("/login");
    router.refresh();
  }, [logActivity, router]);

  // ---- Hydrate persisted demo state once, on mount ----
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const persisted = loadPersistedState();
    setIncidents(persisted.incidents);
    setNotifications(persisted.notifications);
    setAuditLog(persisted.auditLog);
    setActiveSimulation(persisted.activeSimulation);
    setLive(persisted.live);
  }, []);

  // Real (with demo fallback) incident feed — see services/ops.ts. Only
  // applied once at hydration, before which any locally-created/acknowledged
  // incidents would otherwise be clobbered.
  useEffect(() => {
    let cancelled = false;
    getIncidents().then((fetched) => {
      if (!cancelled && fetched.length > 0 && !hydrated.current) setIncidents(fetched);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Persist the demo-mutable slice on every change ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    const snapshot: PersistedDemoState = { incidents, notifications, auditLog, activeSimulation, live };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Storage full/unavailable (private mode) — demo still works, just
      // won't survive a refresh. Not worth surfacing to the user.
    }
  }, [incidents, notifications, auditLog, activeSimulation, live]);

  // Subtle "live" telemetry — nudges values within realistic bounds.
  useEffect(() => {
    const clamp = (v: number, lo: number, hi: number) =>
      Math.max(lo, Math.min(hi, v));
    const step = () => (Math.random() < 0.5 ? -1 : 1);
    const id = setInterval(() => {
      setLive((p) => ({
        activeAlerts: clamp(p.activeAlerts + (Math.random() < 0.55 ? step() : 0), 11, 19),
        criticalZones: clamp(p.criticalZones + (Math.random() < 0.25 ? step() : 0), 2, 5),
        activeIncidents: clamp(p.activeIncidents + (Math.random() < 0.4 ? step() : 0), 5, 10),
        fieldReports: clamp(p.fieldReports + (Math.random() < 0.5 ? 1 : 0), 32, 48),
        rainfall: clamp(p.rainfall + Math.round((Math.random() - 0.45) * 6), 120, 168),
        tick: p.tick + 1,
      }));
    }, 4200);
    return () => clearInterval(id);
  }, []);

  const toggleLayer = useCallback((id: string) => {
    setLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const openModal = useCallback((m: Exclude<ModalKind, null>) => {
    setActiveModal(m);
  }, []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  const openDispatch = useCallback((incidentId: string) => setDispatchTargetId(incidentId), []);
  const closeDispatch = useCallback(() => setDispatchTargetId(null), []);

  const openResetConfirm = useCallback(() => setResetConfirmOpen(true), []);
  const closeResetConfirm = useCallback(() => setResetConfirmOpen(false), []);

  const selectIncident = useCallback((id: string | null) => {
    setSelectedIncidentId(id);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const createIncident = useCallback(
    (input: CreateIncidentInput): Incident => {
      const id = `inc-${Date.now().toString(36)}`;
      const incident: Incident = {
        id,
        severity: input.severity,
        title: input.description.slice(0, 60) || input.category,
        location: input.location,
        timeAgo: "Just now",
        x: 50,
        y: 50,
        lngLat: input.lngLat,
        status: "new",
        category: input.category,
        reportedBy: input.source,
        summary: input.affectedArea
          ? `${input.description} Affected area: ${input.affectedArea}.`
          : input.description,
        createdAt: new Date().toISOString(),
      };
      setIncidents((prev) => [incident, ...prev]);
      setNotifications((prev) => [
        {
          id: `ntf-${id}`,
          severity: input.severity,
          title: `Incident reported · ${input.location}`,
          detail: input.description.slice(0, 90),
          timeAgo: "Just now",
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setLive((p) => ({
        ...p,
        activeIncidents: p.activeIncidents + 1,
        fieldReports: p.fieldReports + 1,
        criticalZones: input.severity === "critical" ? p.criticalZones + 1 : p.criticalZones,
      }));
      logActivity("Incident created", `${input.location} · ${input.category}`);
      return incident;
    },
    [logActivity],
  );

  const acknowledgeIncident = useCallback(
    (id: string) => {
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === id
            ? {
                ...inc,
                status: inc.status === "new" ? "acknowledged" : inc.status,
                acknowledgedBy: "Ops Command",
                acknowledgedAt: new Date().toISOString(),
              }
            : inc,
        ),
      );
      setLive((p) => ({ ...p, activeAlerts: Math.max(0, p.activeAlerts - 1) }));
      const inc = incidents.find((i) => i.id === id);
      logActivity("Incident acknowledged", inc?.location ?? id);
    },
    [incidents, logActivity],
  );

  const updateIncidentStatus = useCallback(
    (id: string, status: IncidentStatus) => {
      setIncidents((prev) => prev.map((inc) => (inc.id === id ? { ...inc, status } : inc)));
      const inc = incidents.find((i) => i.id === id);
      logActivity("Incident updated", `${inc?.location ?? id} → ${status}`);
    },
    [incidents, logActivity],
  );

  const dispatchUnit = useCallback(
    (id: string, unitId: string, priority: string, notes: string) => {
      const unit = RESPONSE_UNITS.find((u) => u.id === unitId);
      if (!unit) return;
      const dispatchedAt = new Date().toISOString();
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === id
            ? {
                ...inc,
                status: "dispatched",
                dispatch: {
                  unitId: unit.id,
                  unitLabel: unit.label,
                  priority,
                  notes,
                  eta: `~${unit.etaMinutes} min (estimated)`,
                  dispatchedBy: "Ops Command",
                  dispatchedAt,
                },
              }
            : inc,
        ),
      );
      const inc = incidents.find((i) => i.id === id);
      setNotifications((prev) => [
        {
          id: `ntf-dispatch-${Date.now()}`,
          severity: inc?.severity ?? "moderate",
          title: "Response unit dispatched",
          detail: `${unit.label} → ${inc?.location ?? "incident"} · ETA ~${unit.etaMinutes} min`,
          timeAgo: "Just now",
          read: false,
          createdAt: dispatchedAt,
        },
        ...prev,
      ]);
      logActivity("Unit dispatched", `${unit.label} → ${inc?.location ?? id}`);
    },
    [incidents, logActivity],
  );

  const runSimulation = useCallback(
    (params: SimulationParams): SimulationResult => {
      const rainfallDeltaMm = Math.round(params.intensity * 0.6);
      const soilMoistureDeltaPct = Math.round(params.intensity * 0.15 + params.duration * 0.1);
      const delta = +(params.intensity * 0.12 + params.duration * 0.35).toFixed(1);
      const projectedRisk = Math.min(99, +((87.4 + delta).toFixed(1)));
      const result: SimulationResult = {
        scenarioLabel: params.scenarioLabel,
        intensity: params.intensity,
        duration: params.duration,
        projectedRisk,
        delta,
        rainfallDeltaMm,
        soilMoistureDeltaPct,
        appliedAt: new Date().toISOString(),
      };
      setActiveSimulation(result);
      setLive((p) => ({ ...p, rainfall: p.rainfall + rainfallDeltaMm }));
      logActivity(
        "Scenario simulated",
        `${params.scenarioLabel} · intensity ${params.intensity} · projected ${projectedRisk}%`,
      );
      return result;
    },
    [logActivity],
  );

  const clearSimulation = useCallback(() => setActiveSimulation(null), []);

  const resetDemo = useCallback(() => {
    setIncidents(INCIDENTS);
    setNotifications(NOTIFICATIONS);
    setAuditLog([]);
    setActiveSimulation(null);
    setLive(INITIAL_LIVE);
    setSelectedIncidentId(null);
    setSelectedEventId(null);
    setLayers({ ...DEFAULT_LAYER_STATE });
    setResetConfirmOpen(false);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    logActivity("Demo reset", "Restored seed dataset.");
  }, [logActivity]);

  const value = useMemo<CommandState>(() => {
    const selectedIncident =
      incidents.find((i) => i.id === selectedIncidentId) ?? null;
    return {
      session,
      sessionLoading,
      permissions: DEMO_PERMISSIONS,
      logout,
      live,
      leftCollapsed,
      rightCollapsed,
      toggleLeftCollapsed: () => setLeftCollapsed((v) => !v),
      toggleRightCollapsed: () => setRightCollapsed((v) => !v),
      mobileNav,
      openMobileNav: (side: Exclude<MobileNav, null>) => setMobileNav(side),
      closeMobileNav: () => setMobileNav(null),
      layers,
      toggleLayer,
      layerPanelOpen,
      setLayerPanelOpen,
      notificationsOpen,
      setNotificationsOpen,
      notifications,
      unreadNotificationCount: notifications.filter((n) => !n.read).length,
      markNotificationRead,
      markAllNotificationsRead,
      auditLog,
      activeModal,
      openModal,
      closeModal,
      dispatchTargetId,
      openDispatch,
      closeDispatch,
      resetConfirmOpen,
      openResetConfirm,
      closeResetConfirm,
      resetDemo,
      incidents,
      createIncident,
      acknowledgeIncident,
      updateIncidentStatus,
      dispatchUnit,
      selectedIncidentId,
      selectIncident,
      selectedIncident,
      selectedTimelineId,
      selectTimeline: setSelectedTimelineId,
      selectedEventId,
      selectEvent: setSelectedEventId,
      zoom,
      zoomIn: () => setZoom((z) => Math.min(14, +(z + 0.5).toFixed(1))),
      zoomOut: () => setZoom((z) => Math.max(4, +(z - 0.5).toFixed(1))),
      activeSimulation,
      runSimulation,
      clearSimulation,
    };
  }, [
    session,
    sessionLoading,
    logout,
    live,
    leftCollapsed,
    rightCollapsed,
    mobileNav,
    layers,
    toggleLayer,
    layerPanelOpen,
    notificationsOpen,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    auditLog,
    activeModal,
    openModal,
    closeModal,
    dispatchTargetId,
    openDispatch,
    closeDispatch,
    resetConfirmOpen,
    openResetConfirm,
    closeResetConfirm,
    resetDemo,
    incidents,
    createIncident,
    acknowledgeIncident,
    updateIncidentStatus,
    dispatchUnit,
    selectedIncidentId,
    selectIncident,
    selectedTimelineId,
    selectedEventId,
    zoom,
    activeSimulation,
    runSimulation,
    clearSimulation,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCommand(): CommandState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCommand must be used within CommandProvider");
  return ctx;
}
