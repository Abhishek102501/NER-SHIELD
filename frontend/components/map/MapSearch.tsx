"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Landmark,
  Loader2,
  MapPin,
  MapPinned,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  GeocodingError,
  parseCoordinateInput,
  searchLocations,
  type LocationCategory,
  type LocationResult,
} from "@/services/geocoding";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<LocationCategory, typeof MapPin> = {
  country: MapPinned,
  state: MapPinned,
  city: Building2,
  district: Building2,
  village: MapPin,
  landmark: Landmark,
  coordinate: MapPin,
};

const CATEGORY_LABEL: Record<LocationCategory, string> = {
  country: "Country",
  state: "State",
  city: "City",
  district: "District",
  village: "Village",
  landmark: "Landmark",
  coordinate: "Coordinate",
};

interface MapSearchProps {
  onSelect: (result: LocationResult) => void;
  onClear: () => void;
}

/** Professional location search over the Command Center map — countries, states,
 * cities, districts, villages, landmarks and raw "lat, lng" input, via OSM Nominatim. */
export function MapSearch({ onSelect, onClear }: MapSearchProps) {
  const listboxId = useId();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selected, setSelected] = useState<LocationResult | null>(null);

  const debouncedQuery = useDebouncedValue(query, 350);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  // A pure, synchronous function of `debouncedQuery` — computed directly during
  // render (no network, no effect) rather than mirrored into state.
  const coordResult = useMemo(
    () => parseCoordinateInput(debouncedQuery.trim()),
    [debouncedQuery],
  );

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  // Debounced network search — coordinate input short-circuits this entirely
  // (handled by `coordResult` above). The empty/too-short branches below
  // intentionally skip touching state: the dropdown is already hidden whenever
  // `query` (not debounced) is blank via `showDropdown`, so stale results/error
  // never render — resetting them here would just be a synchronous
  // setState-in-effect for no visible benefit, and any in-flight fetch's own
  // `.finally` still clears `loading`.
  useEffect(() => {
    if (selected) return; // don't re-search right after picking a result
    const trimmed = debouncedQuery.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (coordResult) return;

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    searchLocations(trimmed, { signal: controller.signal })
      .then((found) => {
        if (requestIdRef.current !== requestId) return;
        setResults(found);
        setActiveIndex(found.length ? 0 : -1);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (requestIdRef.current !== requestId) return;
        setResults([]);
        setError(
          err instanceof GeocodingError
            ? err.message
            : "Location search failed. Check your connection and try again.",
        );
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, selected, coordResult]);

  // Click-outside closes the dropdown (but keeps the field expanded if it has text).
  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        if (!query.trim()) setExpanded(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [expanded, query]);

  function pick(result: LocationResult) {
    setSelected(result);
    setQuery(result.label);
    setResults([]);
    setActiveIndex(-1);
    onSelect(result);
  }

  function clear() {
    setQuery("");
    setSelected(null);
    setResults([]);
    setError(null);
    setActiveIndex(-1);
    requestIdRef.current++;
    onClear();
    inputRef.current?.focus();
  }

  // Coordinate input overlays any stale fetched results with the single parsed
  // point, and is always the highlighted (only) entry.
  const displayResults = coordResult ? [coordResult] : results;
  const displayActiveIndex = coordResult ? 0 : activeIndex;

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (query || selected) {
        clear();
      } else {
        setExpanded(false);
        inputRef.current?.blur();
      }
      return;
    }
    if (!showDropdown || !displayResults.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % displayResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + displayResults.length) % displayResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pickIdx = displayActiveIndex >= 0 ? displayActiveIndex : 0;
      if (displayResults[pickIdx]) pick(displayResults[pickIdx]);
    }
  }

  const showDropdown = expanded && !selected && (query.trim().length > 0);

  return (
    <div ref={rootRef} className="relative">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="Search for a location"
          className="glass-float grid h-9 w-9 place-items-center rounded-lg text-fg-muted transition-colors hover:text-accent"
        >
          <Search size={15} />
        </button>
      ) : (
        <div className="glass-float flex h-9 w-[min(78vw,20rem)] items-center gap-2 rounded-lg px-2.5 sm:w-72">
          <Search size={14} className="shrink-0 text-fg-dim" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search country, state, city, coordinates…"
            aria-label="Search location"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
            className="w-full min-w-0 bg-transparent text-[12px] text-fg placeholder:text-fg-dim focus:outline-none"
          />
          {loading && <Loader2 size={13} className="shrink-0 animate-spin text-accent" />}
          {(query || selected) && !loading && (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              className="shrink-0 text-fg-dim hover:text-fg"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="glass-float absolute left-0 top-[calc(100%+8px)] z-30 max-h-72 w-[min(78vw,20rem)] overflow-y-auto rounded-xl p-1.5 sm:w-72"
          >
            {error && !coordResult ? (
              <div className="flex items-start gap-2 px-2.5 py-3 text-[11px] text-fg-muted">
                <TriangleAlert size={14} className="mt-0.5 shrink-0 text-sev-high" />
                <span>{error}</span>
              </div>
            ) : loading && displayResults.length === 0 ? (
              <div className="flex items-center gap-2 px-2.5 py-3 text-[11px] text-fg-dim">
                <Loader2 size={13} className="animate-spin" />
                Searching…
              </div>
            ) : displayResults.length === 0 ? (
              <div className="px-2.5 py-3 text-[11px] text-fg-dim">
                No locations found for &ldquo;{query.trim()}&rdquo;.
              </div>
            ) : (
              <ul id={listboxId} role="listbox">
                {displayResults.map((r, i) => {
                  const Icon = CATEGORY_ICON[r.category];
                  const active = i === displayActiveIndex;
                  return (
                    <li key={r.id} role="option" aria-selected={active}>
                      <button
                        type="button"
                        onClick={() => pick(r)}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                          active ? "bg-accent/10 text-fg" : "text-fg-muted hover:bg-white/5",
                        )}
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/5 text-accent">
                          <Icon size={13} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-medium text-fg">
                            {r.label}
                          </span>
                          {r.subLabel && (
                            <span className="block truncate text-[10px] text-fg-dim">
                              {r.subLabel}
                            </span>
                          )}
                        </span>
                        <span className="eyebrow shrink-0 text-[8.5px] text-fg-dim">
                          {CATEGORY_LABEL[r.category]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="glass-float absolute left-0 top-[calc(100%+8px)] z-30 w-[min(78vw,20rem)] rounded-xl p-3 sm:w-72"
          >
            <div className="flex items-start gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                {(() => {
                  const Icon = CATEGORY_ICON[selected.category];
                  return <Icon size={14} />;
                })()}
              </span>
              <div className="min-w-0 flex-1">
                <span className="eyebrow text-accent/70">{CATEGORY_LABEL[selected.category]}</span>
                <p className="truncate text-[13px] font-semibold text-fg">{selected.label}</p>
                {selected.subLabel && (
                  <p className="truncate text-[10px] text-fg-dim">{selected.subLabel}</p>
                )}
                <p className="numeric mt-1 text-[10px] text-fg-muted">
                  {selected.lat.toFixed(4)}, {selected.lon.toFixed(4)}
                </p>
              </div>
              <button
                type="button"
                onClick={clear}
                aria-label="Clear selected location"
                className="shrink-0 text-fg-dim hover:text-fg"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
