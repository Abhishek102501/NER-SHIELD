"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Activity, FlaskConical, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RISK_SCORE } from "@/data/risk";
import { useCommand } from "@/lib/command-context";
import { cn } from "@/lib/utils";

const SCENARIOS = [
  { id: "rainfall", label: "Rainfall Surge" },
  { id: "cloudburst", label: "Cloudburst" },
  { id: "seismic", label: "Seismic Trigger" },
  { id: "custom", label: "Custom" },
] as const;

type Phase = "idle" | "running" | "done";

export function SimulationModal() {
  const { activeModal, closeModal } = useCommand();
  const open = activeModal === "simulation";

  const [scenario, setScenario] = useState<string>("rainfall");
  const [intensity, setIntensity] = useState(60); // mm/h
  const [duration, setDuration] = useState(12); // h
  const [phase, setPhase] = useState<Phase>("idle");

  // Deterministic mock projection.
  const projected = Math.min(
    99,
    Math.round(
      (RISK_SCORE.value + intensity * 0.12 + duration * 0.35) * 10,
    ) / 10,
  );
  const delta = +(projected - RISK_SCORE.value).toFixed(1);

  const run = () => {
    setPhase("running");
    window.setTimeout(() => setPhase("done"), 950);
  };
  const reset = () => setPhase("idle");

  const handleClose = () => {
    closeModal();
    window.setTimeout(reset, 250);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      eyebrow="Scenario Modelling"
      title="Simulation Mode"
      icon={<FlaskConical size={17} />}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-fg-dim">
            Demonstration model · no backend inference
          </span>
          <div className="flex gap-2">
            {phase === "done" ? (
              <button
                onClick={reset}
                className="flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-2 text-[12px] font-medium text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
              >
                <RotateCcw size={13} /> Reset
              </button>
            ) : null}
            <button
              onClick={run}
              disabled={phase === "running"}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {phase === "running" ? (
                <>
                  <Activity size={13} className="animate-spin" /> Running…
                </>
              ) : (
                <>
                  <Play size={13} /> Run Simulation
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Scenario */}
        <div>
          <p className="eyebrow mb-2">Scenario</p>
          <div className="grid grid-cols-2 gap-1.5">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-[12px] font-medium transition-colors",
                  scenario === s.id
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-white/10 bg-white/[0.02] text-fg-muted hover:border-white/20",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Parameters */}
        <div className="space-y-4">
          <SimSlider
            label="Rainfall Intensity"
            value={intensity}
            min={0}
            max={120}
            unit="mm/h"
            onChange={setIntensity}
          />
          <SimSlider
            label="Event Duration"
            value={duration}
            min={1}
            max={48}
            unit="h"
            onChange={setDuration}
          />
        </div>

        {/* Result */}
        <AnimatePresence mode="wait">
          {phase === "done" ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-sev-critical/30 bg-sev-critical/[0.06] p-4"
            >
              <p className="eyebrow mb-2 text-sev-critical">Projected Outcome</p>
              <div className="flex items-end gap-4">
                <div>
                  <span className="numeric text-3xl font-semibold text-fg">
                    {projected}%
                  </span>
                  <p className="mt-1 text-[11px] text-fg-muted">
                    Peak risk index
                  </p>
                </div>
                <div className="pb-1">
                  <span className="numeric text-sm font-semibold text-sev-critical">
                    ▲ +{delta}%
                  </span>
                  <p className="text-[11px] text-fg-dim">vs. current</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-white/8 bg-white/[0.02] p-4 text-[12px] text-fg-muted"
            >
              Adjust the parameters and run the model to project a peak risk
              index for the{" "}
              <span className="text-fg">
                {SCENARIOS.find((s) => s.id === scenario)?.label}
              </span>{" "}
              scenario.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}

function SimSlider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12px] text-fg-muted">{label}</span>
        <span className="numeric text-[12px] font-semibold text-fg">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ns-range w-full"
      />
    </div>
  );
}
