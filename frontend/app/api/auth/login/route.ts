import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEMO_SESSION_COOKIE, DEMO_USER, encodeSession } from "@/lib/auth";

/** Creates the demo session. Real auth would verify credentials here first;
 * this account requires none by design (it's a training account, not a
 * privileged one) — see lib/auth.ts. */
export async function POST() {
  const session = { ...DEMO_USER, loggedInAt: new Date().toISOString() };
  const cookieStore = await cookies();
  cookieStore.set(DEMO_SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h demo session
  });
  return NextResponse.json({ session });
}
