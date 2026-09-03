"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LAYER_STATE } from "@/data/layers";
import { INCIDENTS } from "@/data/incidents";
import { RISK_TIMELINE } from "@/data/timeline";
import type { Incident } from "@/types";

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

interface CommandState {
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

  // Modals
  activeModal: ModalKind;
  openModal: (m: Exclude<ModalKind, null>) => void;
  closeModal: () => void;

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
}

const Ctx = createContext<CommandState | null>(null);

const NOW_POINT = RISK_TIMELINE.find((p) => p.now) ?? RISK_TIMELINE[0];

export function CommandProvider({ children }: { children: ReactNode }) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState<MobileNav>(null);
  const [layers, setLayers] = useState<Record<string, boolean>>({
    ...DEFAULT_LAYER_STATE,
  });
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null,
  );
  const [selectedTimelineId, setSelectedTimelineId] = useState<string>(
    NOW_POINT.id,
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(7.5);
  const [live, setLive] = useState<LiveMetrics>({
    activeAlerts: 14,
    criticalZones: 3,
    activeIncidents: 7,
    fieldReports: 32,
    rainfall: 142,
    tick: 0,
  });

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

  const selectIncident = useCallback((id: string | null) => {
    setSelectedIncidentId(id);
  }, []);

  const value = useMemo<CommandState>(() => {
    const selectedIncident =
      INCIDENTS.find((i) => i.id === selectedIncidentId) ?? null;
    return {
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
      activeModal,
      openModal,
      closeModal,
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
    };
  }, [
    live,
    leftCollapsed,
    rightCollapsed,
    mobileNav,
    layers,
    toggleLayer,
    layerPanelOpen,
    notificationsOpen,
    activeModal,
    openModal,
    closeModal,
    selectedIncidentId,
    selectIncident,
    selectedTimelineId,
    selectedEventId,
    zoom,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCommand(): CommandState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCommand must be used within CommandProvider");
  return ctx;
}
