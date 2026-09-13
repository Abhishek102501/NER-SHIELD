import type { DemoSession, PermissionSet } from "@/types";

/**
 * Demo authentication layer. This is intentionally isolated from any future
 * production auth: it lives in one file, under one cookie name, with one
 * well-known account. Swapping in a real identity provider later means
 * replacing the contents of `login`/`logout`/`getSession` below — nothing
 * in the UI talks to cookies or tokens directly, only to these functions
 * (client-side) or the `/api/auth/*` routes (server-side), via
 * `lib/command-context.tsx`.
 */
export const DEMO_SESSION_COOKIE = "ns_demo_session";

/** The one demo identity this app ships. Never a real privileged account. */
export const DEMO_USER: Omit<DemoSession, "loggedInAt"> = {
  name: "Ops Command",
  role: "Duty Officer",
  accountType: "Demo / Training Account",
  organization: "NER-SHIELD Disaster Intelligence & Response",
};

/**
 * Duty Officer demo capabilities — deliberately short of ADMIN. Every
 * UI control gated by a `false` flag here must show why it's disabled
 * rather than silently vanishing.
 */
export const DEMO_PERMISSIONS: PermissionSet = {
  viewMap: true,
  viewIncidents: true,
  createIncident: true,
  updateIncident: true,
  dispatch: true,
  acknowledgeAlert: true,
  simulateScenario: true,
  admin: false,
};

export function encodeSession(session: DemoSession): string {
  return Buffer.from(JSON.stringify(session), "utf-8").toString("base64url");
}

export function decodeSession(raw: string | undefined | null): DemoSession | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf-8");
    const parsed = JSON.parse(json) as Partial<DemoSession>;
    if (typeof parsed.name === "string" && typeof parsed.loggedInAt === "string") {
      return parsed as DemoSession;
    }
    return null;
  } catch {
    return null;
  }
}
