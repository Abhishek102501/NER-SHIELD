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
      className={cn("relative scroll-mt-20 px-6 py-24 sm:py-28", className)}
    >
      <div className={cn(!bleed && "mx-auto w-full max-w-6xl")}>{children}</div>
    </section>
  );
}
