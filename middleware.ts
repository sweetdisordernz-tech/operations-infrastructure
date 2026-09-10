import { NextRequest, NextResponse } from "next/server";
import {
  isSurface,
  SURFACE_COOKIE_NAME,
  surfaceFromHost,
  surfaceRootPath,
  type Surface,
} from "@/lib/subdomains";

export const config = {
  matcher: [
    /*
     * Run on everything except Next.js internals and static assets - both
     * the well-known ones (favicon.ico) and anything else served straight
     * out of /public (e.g. sweet-disorder-logo.png), which is why the
     * exclusion also covers any path ending in a file extension rather
     * than naming files one by one. Without this, a public asset request
     * made while a surface cookie/override is active gets the same
     * `${prefix}${pathname}` rewrite as a real page (see below) and 404s,
     * because no such path exists under e.g. /portal.
     * API routes ARE matched (surfaces need their own API scoping too),
     * but we skip the actual rewrite for /api and let those routes read
     * the resolved surface via header/cookie if they need it.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Never rewrite Next internals, already-prefixed surface paths, or the
  // API tree — API routes are shared across surfaces and handle their own
  // auth/scoping.
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Reserved escape hatch, reachable from inside any surface (see
  // SwitchAppLink): clears the dev-override cookie and sends the browser
  // back to "/" on the same host. Handled before any surface resolution so
  // it works regardless of which surface set the cookie in the first
  // place - without this, once the cookie is set there is no way back to
  // the picker short of manually clearing cookies or editing the URL.
  if (pathname === "/switch-app") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    const response = NextResponse.redirect(url);
    response.cookies.delete(SURFACE_COOKIE_NAME);
    return response;
  }

  const host = request.headers.get("host");
  let surface: Surface | null = surfaceFromHost(host);

  // Local dev override: ?surface=wholesale|admin|ops|floor sets a cookie so
  // subsequent requests (which won't carry the query param) still resolve
  // to the right surface without real subdomain DNS.
  const overrideParam = searchParams.get("surface");
  let setCookie: Surface | null = null;
  if (isSurface(overrideParam)) {
    surface = overrideParam;
    setCookie = overrideParam;
  } else if (!surface) {
    const cookieSurface = request.cookies.get(SURFACE_COOKIE_NAME)?.value;
    if (isSurface(cookieSurface)) {
      surface = cookieSurface;
    }
  }

  if (!surface) {
    // Unknown host (bare root domain, a Vercel preview URL, localhost with
    // no override/cookie yet) - let it fall through to the default
    // top-level app/page.tsx, which explains the surface picker / override.
    return NextResponse.next();
  }

  const prefix = surfaceRootPath(surface);
  const url = request.nextUrl.clone();
  url.pathname = `${prefix}${pathname === "/" ? "" : pathname}`;
  url.searchParams.delete("surface");

  const response = NextResponse.rewrite(url);
  response.headers.set("x-sd-surface", surface);

  if (setCookie) {
    response.cookies.set(SURFACE_COOKIE_NAME, setCookie, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}
