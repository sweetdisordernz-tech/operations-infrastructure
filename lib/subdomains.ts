/**
 * Single source of truth for mapping request hostnames to the internal
 * Next.js route group that should render them.
 *
 * Four surfaces share one Next.js app/codebase/DB, split by subdomain in
 * production:
 *   portal.sweetdisorder.co.nz    -> (wholesale)  B2B customer portal
 *   admin.sweetdisorder.co.nz     -> (admin)      Master Connect admin dashboard
 *   dashboard.sweetdisorder.co.nz -> (ops)        Molly's simplified daily-use dashboard
 *   floor.sweetdisorder.co.nz     -> (floor)      Production/floor task checklist
 *
 * Subdomains don't resolve on localhost, so local dev supports a
 * `?surface=wholesale|admin|ops|floor` query param override that sets a
 * cookie (see middleware.ts) instead of requiring real DNS/hosts-file setup.
 */

export const SURFACES = ["wholesale", "admin", "ops", "floor"] as const;

export type Surface = (typeof SURFACES)[number];

export const DEFAULT_SURFACE: Surface = "wholesale";

/** Subdomain label (the part before the root domain) for each surface. */
export const SURFACE_SUBDOMAINS: Record<Surface, string> = {
  wholesale: "portal",
  admin: "admin",
  ops: "dashboard",
  floor: "floor",
};

/** Route group directory (under /app) that serves each surface. */
export const SURFACE_ROUTE_GROUPS: Record<Surface, string> = {
  wholesale: "(wholesale)",
  admin: "(admin)",
  ops: "(ops)",
  floor: "(floor)",
};

/**
 * Internal URL path prefix each surface's pages live under, e.g.
 * app/(wholesale)/portal/page.tsx.
 *
 * Route groups `(wholesale)`, `(admin)`, etc. are purely organizational and
 * don't add a URL segment, so four route groups can't all resolve at `/`
 * without colliding. Middleware rewrites the incoming request (based on
 * host, or the local-dev surface cookie) to prepend this prefix, so
 * `portal.sweetdisorder.co.nz/orders/123` is served internally by
 * `/portal/orders/123` inside the `(wholesale)` route group. This is a
 * rewrite, not a redirect, so the prefix never appears in the browser's
 * address bar.
 */
export const SURFACE_PATH_PREFIX: Record<Surface, string> = {
  wholesale: "/portal",
  admin: "/admin",
  ops: "/dashboard",
  floor: "/floor",
};

export const SURFACE_COOKIE_NAME = "sd-surface";

const SUBDOMAIN_TO_SURFACE: Record<string, Surface> = Object.fromEntries(
  SURFACES.map((surface) => [SURFACE_SUBDOMAINS[surface], surface]),
) as Record<string, Surface>;

export function isSurface(value: string | null | undefined): value is Surface {
  return !!value && (SURFACES as readonly string[]).includes(value);
}

/**
 * Resolve a Surface from a request's `host` header, e.g.
 * "portal.sweetdisorder.co.nz", "admin.localhost:3000", "portal.sweetdisorder.co.nz:443".
 * Returns null when the hostname's leading label doesn't match a known surface
 * (e.g. bare "sweetdisorder.co.nz", "localhost:3000", or a Vercel preview URL).
 */
export function surfaceFromHost(host: string | null | undefined): Surface | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  const firstLabel = hostname.split(".")[0];
  return SUBDOMAIN_TO_SURFACE[firstLabel] ?? null;
}

export function surfaceRootPath(surface: Surface): string {
  return SURFACE_PATH_PREFIX[surface];
}

/**
 * Builds a link to another surface's home page, for use from a Server
 * Component (reads the current request's `host` header via `next/headers`).
 *
 * When the current host is a real, recognized subdomain (production, once
 * DNS is set up), returns a proper absolute URL on the target surface's own
 * subdomain - e.g. "https://dashboard.sweetdisorder.co.nz" from
 * "admin.sweetdisorder.co.nz" - so the address bar correctly reflects the
 * surface you land on and the link is bookmarkable.
 *
 * When the host isn't a recognized subdomain (localhost, a Vercel preview
 * URL, or before DNS is connected), falls back to the same-host
 * `?surface=` query-param override middleware.ts already honors for local
 * dev - so cross-surface links work correctly on a preview deployment too,
 * without needing to know or guess the eventual production domain.
 */
export async function crossSurfaceHref(targetSurface: Surface): Promise<string> {
  const { headers } = await import("next/headers");
  const host = (await headers()).get("host");
  const currentSurface = host ? surfaceFromHost(host) : null;

  if (currentSurface && host) {
    const rootDomainAndPort = host.split(".").slice(1).join(".");
    const targetSubdomain = SURFACE_SUBDOMAINS[targetSurface];
    return `https://${targetSubdomain}.${rootDomainAndPort}`;
  }

  return `/?surface=${targetSurface}`;
}
