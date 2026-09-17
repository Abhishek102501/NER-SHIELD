"use client";

import { Info, Settings } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useCommand } from "@/lib/command-context";
import { useAccountSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-fg">{label}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-fg-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
          checked ? "border-accent/50 bg-accent/80" : "border-white/15 bg-white/10",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

function SegmentRow<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="py-2.5">
      <p className="text-[12px] font-medium text-fg">{label}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-fg-muted">{description}</p>
      <div className="mt-2 inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
              value === opt.value
                ? "bg-accent/85 text-black"
                : "text-fg-muted hover:text-fg",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Ops Command → Account Settings. Every preference here is frontend-only
 * (localStorage, see lib/settings.ts) — there is no account service to sync
 * to yet, and this panel says so rather than implying otherwise. Session
 * info below is read-only and comes straight from the demo auth session. */
export function AccountSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session } = useCommand();
  const [settings, updateSetting] = useAccountSettings();

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Ops Command"
      title="Account Settings"
      icon={<Settings size={17} />}
      footer={
        <button
          onClick={onClose}
          className="w-full rounded-lg border border-white/12 py-2 text-[12px] font-medium text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
        >
          Done
        </button>
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <Info size={14} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-[11px] leading-snug text-fg-muted">
            These preferences are <span className="font-semibold text-fg">saved to this
            browser only</span> (no backend account service exists yet). They apply
            immediately and persist across refreshes on this device.
          </p>
        </div>

        <section>
          <p className="eyebrow mb-1">Interface Preferences</p>
          <div className="divide-y divide-white/8">
            <SegmentRow
              label="Clock format"
              description="Format used by the live clock in the top bar."
              value={settings.clockFormat}
              options={[
                { value: "24h", label: "24-hour" },
                { value: "12h", label: "12-hour" },
              ]}
              onChange={(v) => updateSetting("clockFormat", v)}
            />
            <ToggleRow
              label="Reduce motion"
              description="Shortens panel/menu animations across the app."
              checked={settings.reduceMotion}
              onChange={(v) => updateSetting("reduceMotion", v)}
            />
          </div>
        </section>

        <section>
          <p className="eyebrow mb-1">Notification Preferences</p>
          <div className="divide-y divide-white/8">
            <SegmentRow
              label="Minimum severity shown"
              description="Hides lower-severity items from the notification bell."
              value={settings.minNotificationSeverity}
              options={[
                { value: "all", label: "All" },
                { value: "moderate", label: "Moderate+" },
                { value: "critical", label: "Critical only" },
              ]}
              onChange={(v) => updateSetting("minNotificationSeverity", v)}
            />
          </div>
        </section>

        <section>
          <p className="eyebrow mb-1">Account / Session Info</p>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] text-fg-muted">
            <p>
              <span className="text-fg-dim">Account:</span>{" "}
              {session?.accountType ?? "—"} (mock authentication, read-only here)
            </p>
            <p className="mt-1">
              <span className="text-fg-dim">Organization:</span> {session?.organization ?? "—"}
            </p>
          </div>
        </section>
      </div>
    </Modal>
  );
}
