"use client";

import { RotateCcw } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useCommand } from "@/lib/command-context";

export function ResetDemoModal() {
  const { resetConfirmOpen, closeResetConfirm, resetDemo } = useCommand();

  return (
    <Modal
      open={resetConfirmOpen}
      onClose={closeResetConfirm}
      title="Reset Demo Environment?"
      icon={<RotateCcw size={17} />}
      accent="critical"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={closeResetConfirm}
            className="rounded-lg border border-white/12 px-4 py-2 text-[12px] font-medium text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
          >
            Cancel
          </button>
          <button
            onClick={resetDemo}
            className="rounded-lg bg-sev-critical px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Reset
          </button>
        </div>
      }
    >
      <p className="text-[13px] leading-relaxed text-fg-muted">
        This will remove all changes made during this demo session — created
        incidents, acknowledgements, dispatches, and any running scenario
        simulation — and restore the original seed dataset. Your login
        session is not affected.
      </p>
    </Modal>
  );
}
