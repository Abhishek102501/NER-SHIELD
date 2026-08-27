"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  icon?: ReactNode;
  accent?: "accent" | "critical";
  children: ReactNode;
  footer?: ReactNode;
  /** Presentation: centered dialog or right-side drawer. */
  variant?: "dialog" | "drawer";
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  icon,
  accent = "accent",
  children,
  footer,
  variant = "dialog",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const accentText = accent === "critical" ? "text-sev-critical" : "text-accent";
  const accentBar =
    accent === "critical" ? "bg-sev-critical" : "bg-accent";

  const isDrawer = variant === "drawer";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            "fixed inset-0 z-50 flex p-4 sm:p-6",
            isDrawer ? "justify-end" : "items-center justify-center",
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop */}
          <button
            aria-label="Close overlay"
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={
              isDrawer
                ? { opacity: 0, x: 40 }
                : { opacity: 0, y: 18, scale: 0.98 }
            }
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={
              isDrawer
                ? { opacity: 0, x: 40 }
                : { opacity: 0, y: 12, scale: 0.98 }
            }
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className={cn(
              "glass-float relative z-10 flex max-h-full flex-col overflow-hidden rounded-2xl",
              isDrawer ? "h-full w-full max-w-md" : "w-full max-w-lg",
            )}
          >
            <span
              className={cn("absolute inset-x-0 top-0 h-px opacity-60", accentBar)}
            />
            {/* Header */}
            <header className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4">
              <div className="flex items-center gap-3">
                {icon && (
                  <span
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.03]",
                      accentText,
                    )}
                  >
                    {icon}
                  </span>
                )}
                <div>
                  {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
                  <h2 className="text-sm font-semibold tracking-tight text-fg">
                    {title}
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
              >
                <X size={16} />
              </button>
            </header>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {children}
            </div>

            {footer && (
              <footer className="border-t border-white/8 px-5 py-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
