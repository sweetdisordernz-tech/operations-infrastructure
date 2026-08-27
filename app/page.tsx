import { SURFACES, SURFACE_SUBDOMAINS } from "@/lib/subdomains";

const SURFACE_LABELS: Record<string, string> = {
  wholesale: "Wholesale Portal",
  admin: "Master Connect (Admin)",
  ops: "Owner Dashboard",
  floor: "Floor Tasks",
};

/**
 * Rendered only when the request's host doesn't match a known subdomain and
 * no `sd-surface` cookie is set yet - i.e. bare localhost on first visit, or
 * the root domain in production. Lets you jump into any surface locally
 * without DNS by using the `?surface=` override handled in middleware.ts.
 */
export default function RootFallbackPage() {
  return (
    <div className="sd-shell">
      <main className="sd-main">
        <div className="sd-card">
          <h1>Sweet Disorder Ops</h1>
          <p>
            This host doesn&apos;t match a known surface subdomain. In
            production each surface lives on its own subdomain
            (portal./admin./dashboard./floor.). For local dev, pick a surface
            below - it sets a cookie so you don&apos;t need real DNS.
          </p>
          <div className="sd-pill-row">
            {SURFACES.map((surface) => (
              <a key={surface} href={`/?surface=${surface}`}>
                {SURFACE_LABELS[surface]} ({SURFACE_SUBDOMAINS[surface]}.)
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
