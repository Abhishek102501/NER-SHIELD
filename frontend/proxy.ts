import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEMO_SESSION_COOKIE, decodeSession } from "@/lib/auth";

// Next 16 renamed `middleware.ts` to `proxy.ts` (same mechanism, new name —
// see node_modules/next/dist/docs/.../file-conventions/proxy.md). This is
// the real route guard: it runs on the server before /command renders, so
// a direct visit while logged out redirects before any protected content
// (or its data) ever reaches the client — not just a client-side UI check.
export function proxy(request: NextRequest) {
  const session = decodeSession(request.cookies.get(DEMO_SESSION_COOKIE)?.value);
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/command/:path*"],
};
