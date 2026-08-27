"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LayoutPanelLeft, PanelRightOpen, Radar } from "lucide-react";
import { CommandMap } from "@/components/map/CommandMap";
import { LayerControl } from "@/components/map/LayerControl";
import { MapLegend } from "@/components/map/MapLegend";
import { PrimaryActions } from "@/components/map/PrimaryActions";
import { FieldReportModal } from "@/components/reports/FieldReportModal";
import { SimulationModal } from "@/components/simulation/SimulationModal";
import { SYSTEM_METRICS } from "@/data/system";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { CommandProvider, useCommand } from "@/lib/command-context";
import { SEVERITY, cn } from "@/lib/utils";
import { BottomTimeline } from "./BottomTimeline";
import { IntelligencePanel } from "./IntelligencePanel";
import { OperationsPanel } from "./OperationsPanel";
import { TopBar } from "./TopBar";

const RAIL_W = 52;

export default function CommandCenter() {
  return (
    <CommandProvider>
      <Shell />
    </CommandProvider>
  );
}

function Shell() {
  const isDesktop = useMediaQuery("(min-width: 1024px)", true);
  const isWide = useMediaQuery("(min-width: 1280px)", true);
  const {
    leftCollapsed,
    rightCollapsed,
    toggleLeftCollapsed,
    toggleRightCollapsed,
    mobileNav,
    openMobileNav,
    closeMobileNav,
  } = useCommand();

  const leftW = isWide ? 320 : 264;
  const rightW = isWide ? 342 : 288;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <TopBar />

      <div className="relative flex min-h-0 flex-1">
        {/* LEFT dock (desktop) */}
        {isDesktop && (
          <InlineDock
            side="left"
            open={!leftCollapsed}
            expandedWidth={leftW}
          >
            {!leftCollapsed ? (
              <OperationsPanel onCollapse={toggleLeftCollapsed} />
            ) : (
              <LeftRail onExpand={toggleLeftCollapsed} />
            )}
          </InlineDock>
        )}

        {/* CENTER — map + bottom timeline */}
        <main className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <CommandMap />
            <MapLegend />

            <div className="absolute left-3 top-3 z-20 flex items-start gap-2">
              <PrimaryActions />
              <LayerControl />
            </div>

            {!isDesktop && (
              <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
                <button
                  onClick={() => openMobileNav("left")}
                  className="glass-float flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-fg"
                >
                  <LayoutPanelLeft size={13} className="text-accent" />{" "}
                  Operations
                </button>
                <button
                  onClick={() => openMobileNav("right")}
                  className="glass-float flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-fg"
                >
                  <Radar size={13} className="text-sev-critical" /> Intelligence
                </button>
              </div>
            )}
          </div>

          <div className="glass z-10 h-[124px] shrink-0 border-t border-white/8 md:h-[150px]">
            <BottomTimeline />
          </div>
        </main>

        {/* RIGHT dock (desktop) */}
        {isDesktop && (
          <InlineDock
            side="right"
            open={!rightCollapsed}
            expandedWidth={rightW}
          >
            {!rightCollapsed ? (
              <IntelligencePanel onCollapse={toggleRightCollapsed} />
            ) : (
              <RightRail onExpand={toggleRightCollapsed} />
            )}
          </InlineDock>
        )}
      </div>

      {/* Mobile drawers */}
      {!isDesktop && (
        <>
          <Drawer
            side="left"
            open={mobileNav === "left"}
            onClose={closeMobileNav}
          >
            <OperationsPanel onCollapse={closeMobileNav} />
          </Drawer>
          <Drawer
            side="right"
            open={mobileNav === "right"}
            onClose={closeMobileNav}
          >
            <IntelligencePanel onCollapse={closeMobileNav} />
          </Drawer>
        </>
      )}

      {/* Modals */}
      <SimulationModal />
      <FieldReportModal />
    </div>
  );
}

/* ---------------- Inline dock (desktop) ---------------- */
function InlineDock({
  side,
  open,
  expandedWidth,
  children,
}: {
  side: "left" | "right";
  open: boolean;
  expandedWidth: number;
  children: React.ReactNode;
}) {
  const width = open ? expandedWidth : RAIL_W;
  return (
    <motion.aside
      initial={false}
      animate={{ width }}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      className={cn(
        "glass z-20 h-full shrink-0 overflow-hidden",
        side === "left" ? "border-r border-white/8" : "border-l border-white/8",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={open ? "full" : "rail"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="h-full"
          style={{ width }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.aside>
  );
}

/* ---------------- Collapsed rails ---------------- */
function LeftRail({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="flex h-full flex-col items-center gap-4 py-3">
      <button
        onClick={onExpand}
        aria-label="Expand operations panel"
        className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
      >
        <LayoutPanelLeft size={15} />
      </button>
      <div className="flex flex-1 flex-col items-center gap-3 pt-2">
        {SYSTEM_METRICS.map((m) => (
          <div key={m.id} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                m.severity ? SEVERITY[m.severity].dot : "bg-white/30",
              )}
            />
            <span className="numeric text-[11px] font-semibold text-fg">
              {m.value}
            </span>
          </div>
        ))}
      </div>
      <span className="[writing-mode:vertical-rl] text-[9px] font-bold uppercase tracking-[0.2em] text-fg-dim">
        Operations
      </span>
    </div>
  );
}

function RightRail({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="flex h-full flex-col items-center gap-4 py-3">
      <button
        onClick={onExpand}
        aria-label="Expand intelligence panel"
        className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
      >
        <PanelRightOpen size={15} />
      </button>
      <div className="flex flex-1 flex-col items-center gap-2 pt-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg border border-sev-critical/30 bg-sev-critical/10 text-sev-critical">
          <Radar size={16} />
        </div>
        <span className="numeric text-[11px] font-bold text-fg">87%</span>
      </div>
      <span className="rotate-180 [writing-mode:vertical-rl] text-[9px] font-bold uppercase tracking-[0.2em] text-fg-dim">
        Risk Engine
      </span>
    </div>
  );
}

/* ---------------- Mobile drawer ---------------- */
function Drawer({
  side,
  open,
  onClose,
  children,
}: {
  side: "left" | "right";
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            aria-label="Close panel"
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: side === "left" ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: side === "left" ? "-100%" : "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            className={cn(
              "glass absolute top-0 h-full w-[86vw] max-w-sm",
              side === "left"
                ? "left-0 border-r border-white/10"
                : "right-0 border-l border-white/10",
            )}
          >
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
