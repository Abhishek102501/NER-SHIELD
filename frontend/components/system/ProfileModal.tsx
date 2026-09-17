"use client";

import { CheckCircle2, ShieldAlert, UserRound, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useCommand } from "@/lib/command-context";
import { cn } from "@/lib/utils";

const PERMISSION_LABELS: Record<string, string> = {
  viewMap: "View map & GIS layers",
  viewIncidents: "View incidents",
  createIncident: "Create incidents",
  updateIncident: "Update incident status",
  dispatch: "Dispatch response units",
  acknowledgeAlert: "Acknowledge alerts",
  simulateScenario: "Run what-if simulations",
  admin: "Administrative access",
};

/** Ops Command → Profile. Reads the live session from useCommand (see
 * lib/command-context.tsx → lib/auth.ts). There is no production identity
 * provider yet, so this always represents the one demo Duty Officer session
 * honestly rather than dressing it up as a real account. */
export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, sessionLoading, permissions } = useCommand();

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Ops Command"
      title="Profile"
      icon={<UserRound size={17} />}
      footer={
        <button
          onClick={onClose}
          className="w-full rounded-lg border border-white/12 py-2 text-[12px] font-medium text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
        >
          Close
        </button>
      }
    >
      {sessionLoading ? (
        <p className="py-8 text-center text-[12px] text-fg-dim">Loading session…</p>
      ) : !session ? (
        <p className="py-8 text-center text-[12px] text-fg-dim">No active session.</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent/80 to-accent-deep text-[15px] font-bold text-black">
              {session.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-fg">{session.name}</p>
              <p className="truncate text-[11px] text-fg-muted">{session.role}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-sev-moderate/25 bg-sev-moderate/8 px-3 py-2.5">
            <ShieldAlert size={14} className="mt-0.5 shrink-0 text-sev-moderate" />
            <p className="text-[11px] leading-snug text-fg-muted">
              <span className="font-semibold text-sev-moderate">MOCK AUTHENTICATION</span> — this
              is a single demo/training session, not a production identity. No real user
              directory or password is involved.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-wider text-fg-dim">
                Account type
              </dt>
              <dd className="mt-0.5 text-fg">{session.accountType}</dd>
            </div>
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-wider text-fg-dim">
                Organization
              </dt>
              <dd className="mt-0.5 text-fg">{session.organization}</dd>
            </div>
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-wider text-fg-dim">
                Operational role
              </dt>
              <dd className="mt-0.5 text-fg">{session.role}</dd>
            </div>
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-wider text-fg-dim">
                Session started
              </dt>
              <dd className="mt-0.5 text-fg">
                {new Date(session.loggedInAt).toLocaleString("en-GB")}
              </dd>
            </div>
          </dl>

          <div>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-fg-dim">
              Capabilities
            </p>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {Object.entries(permissions).map(([key, allowed]) => (
                <li key={key} className="flex items-center gap-1.5 text-[11px]">
                  {allowed ? (
                    <CheckCircle2 size={12} className="shrink-0 text-sev-low" />
                  ) : (
                    <XCircle size={12} className="shrink-0 text-fg-dim" />
                  )}
                  <span className={cn(allowed ? "text-fg-muted" : "text-fg-dim line-through")}>
                    {PERMISSION_LABELS[key] ?? key}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  );
}
