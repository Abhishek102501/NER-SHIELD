"use client";

import { motion } from "framer-motion";
import { FlaskConical, Mountain, RadioTower } from "lucide-react";
import { useCommand } from "@/lib/command-context";

/** The major operational actions, floated over the map (top-right). */
export function PrimaryActions() {
  const { openModal, openLandslideModal } = useCommand();

  return (
    <div className="flex items-center gap-2">
      <motion.button
        type="button"
        onClick={openLandslideModal}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 24 }}
        className="map-card flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold text-slate-800 transition-colors hover:border-accent/50"
      >
        <Mountain size={15} className="text-accent" />
        <span className="hidden sm:inline">Landslide AI Analysis</span>
        <span className="sm:hidden">Landslide AI</span>
      </motion.button>

      <motion.button
        type="button"
        onClick={() => openModal("simulation")}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 24 }}
        className="map-card flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold text-slate-800 transition-colors hover:border-accent/50"
      >
        <FlaskConical size={15} className="text-accent" />
        <span className="hidden sm:inline">Simulate Scenario</span>
        <span className="sm:hidden">Simulate</span>
      </motion.button>

      <motion.button
        type="button"
        onClick={() => openModal("report")}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 24 }}
        className="crit-pulse flex items-center gap-2 rounded-lg border border-sev-critical/40 bg-sev-critical/15 px-3 py-2 text-[12px] font-semibold text-sev-critical transition-colors hover:bg-sev-critical/25"
      >
        <RadioTower size={15} />
        <span className="hidden sm:inline">Report Incident</span>
        <span className="sm:hidden">Report</span>
      </motion.button>
    </div>
  );
}
