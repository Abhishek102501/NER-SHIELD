import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEMO_SESSION_COOKIE, decodeSession } from "@/lib/auth";

/** The session cookie is httpOnly (not readable by client JS on purpose) —
 * the client calls this route to learn who's logged in. */
export async function GET() {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(DEMO_SESSION_COOKIE)?.value);
  return NextResponse.json({ session });
}
