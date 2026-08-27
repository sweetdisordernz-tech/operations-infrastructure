import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLinkToken } from "@/lib/auth/magic-link";
import {
  setSessionCookie,
  STAFF_SESSION_COOKIE,
  WHOLESALE_SESSION_COOKIE,
} from "@/lib/auth/session";
import { isSurface, SURFACE_COOKIE_NAME } from "@/lib/subdomains";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");
  const surfaceParam = searchParams.get("surface");
  const surface = isSurface(surfaceParam) ? surfaceParam : "wholesale";

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const result = await consumeMagicLinkToken(token);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  if (result.wholesaleCustomerId) {
    await setSessionCookie(WHOLESALE_SESSION_COOKIE, result.wholesaleCustomerId);
  } else if (result.userId) {
    await setSessionCookie(STAFF_SESSION_COOKIE, result.userId);
  } else {
    return NextResponse.json({ error: "Token has no associated account" }, { status: 400 });
  }

  // Land back on the surface's (still-placeholder) home page. Also (re)set
  // the local-dev surface cookie so this works the same whether the link
  // was opened on the real subdomain or on localhost.
  const response = NextResponse.redirect(`${origin}/?surface=${surface}`);
  response.cookies.set(SURFACE_COOKIE_NAME, surface, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
