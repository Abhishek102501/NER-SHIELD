"use client";

import { ClipboardList } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useCommand } from "@/lib/command-context";

/** Ops Command → Activity Log. Real actions taken this session (login,
 * incident CRUD, dispatch, acknowledgements, simulations, reset) — see
 * `logActivity` in lib/command-context.tsx. Nothing here is decorative;
 * it is a session log, not a demo-only feature (that's Reset Demo Data). */
export function AuditLogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { auditLog } = useCommand();

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Ops Command"
      title="Activity Log"
      icon={<ClipboardList size={17} />}
      footer={
        <button
          onClick={onClose}
          className="w-full rounded-lg border border-white/12 py-2 text-[12px] font-medium text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
        >
          Close
        </button>
      }
    >
      {auditLog.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-fg-dim">
          No activity recorded yet this session.
        </p>
      ) : (
        <ul className="max-h-96 space-y-1 overflow-y-auto">
          {auditLog.map((event) => (
            <li
              key={event.id}
              className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/5"
            >
              <span className="numeric mt-0.5 shrink-0 text-[10px] text-fg-dim">{event.time}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
                  {event.actor}
                </p>
                <p className="text-[12px] font-medium text-fg">{event.action}</p>
                <p className="truncate text-[11px] text-fg-muted">{event.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
