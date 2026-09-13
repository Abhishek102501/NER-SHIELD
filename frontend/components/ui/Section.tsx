import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Consistent section shell — spacing, max width, optional id anchor. */
export function Section({
  id,
  children,
  className,
  bleed = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  /** Full-bleed inner (skip the max-width container). */
  bleed?: boolean;
}) {
  return (
    <section
      id={id}
      // scroll-mt clears the fixed navbar (~72px tall) on anchor-jump — kept
      // generous rather than exact so it doesn't reopen as a few-pixel overlap
      // under different font metrics/zoom levels.
      className={cn("relative scroll-mt-28 px-6 py-24 sm:py-28", className)}
    >
      <div className={cn(!bleed && "mx-auto w-full max-w-6xl")}>{children}</div>
    </section>
  );
}
