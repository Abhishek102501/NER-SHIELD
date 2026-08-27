"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe media query hook. Uses `defaultValue` for the first render on both
 * server and client (so hydration matches), then reflects the real match.
 * Desktop-first callers pass `true` so the primary layout never flashes.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(defaultValue);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return matches;
}
