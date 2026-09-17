"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Frontend-only account/interface preferences. These are NOT backed by any
 * account service — there isn't one yet (auth is a mock demo session, see
 * lib/auth.ts). Persisted to localStorage so they survive a refresh, scoped
 * to this browser only. Never presented as server-synced.
 */
export interface AccountSettings {
  /** Clock format for the header live clock. */
  clockFormat: "24h" | "12h";
  /** Hides notifications below this severity from the bell dropdown. */
  minNotificationSeverity: "all" | "moderate" | "critical";
  /** Disables/shortens motion for animated UI (independent of OS-level
   * prefers-reduced-motion, which is also respected separately). */
  reduceMotion: boolean;
}

export const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = {
  clockFormat: "24h",
  minNotificationSeverity: "all",
  reduceMotion: false,
};

const STORAGE_KEY = "ns-account-settings-v1";

function loadSettings(): AccountSettings {
  if (typeof window === "undefined") return DEFAULT_ACCOUNT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ACCOUNT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AccountSettings>;
    return { ...DEFAULT_ACCOUNT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_ACCOUNT_SETTINGS;
  }
}

const listeners = new Set<(s: AccountSettings) => void>();
let current: AccountSettings | null = null;

function emit(next: AccountSettings) {
  current = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage full/unavailable (private mode) — preferences just won't persist.
    }
    document.documentElement.dataset.reduceMotion = String(next.reduceMotion);
  }
  listeners.forEach((l) => l(next));
}

/**
 * Shared, localStorage-backed account/interface preferences. Any component
 * calling this hook re-renders when settings change anywhere in the app —
 * no context provider needed since the source of truth is localStorage.
 */
export function useAccountSettings(): [
  AccountSettings,
  <K extends keyof AccountSettings>(key: K, value: AccountSettings[K]) => void,
] {
  const [settings, setSettings] = useState<AccountSettings>(DEFAULT_ACCOUNT_SETTINGS);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      if (current === null) {
        current = loadSettings();
        document.documentElement.dataset.reduceMotion = String(current.reduceMotion);
      }
      setSettings(current);
    }
    const listener = (s: AccountSettings) => setSettings(s);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const update = useCallback(
    <K extends keyof AccountSettings>(key: K, value: AccountSettings[K]) => {
      emit({ ...(current ?? DEFAULT_ACCOUNT_SETTINGS), [key]: value });
    },
    [],
  );

  return [settings, update];
}
