import { SURFACES, SURFACE_SUBDOMAINS, type Surface } from "@/lib/subdomains";
import { LogoutButton } from "@/app/_components/logout-button";

const SURFACE_LABELS: Record<Surface, string> = {
  wholesale: "Wholesale Portal",
  admin: "Master Connect (Admin)",
  ops: "Owner Dashboard",
  floor: "Floor Tasks",
};

export function ComingSoon({
  surface,
  description,
  loginHref,
  signedInAs,
}: {
  surface: Surface;
  description: string;
  loginHref: string;
  signedInAs: string | null;
}) {
  return (
    <div className="sd-shell">
      <header className="sd-topbar">
        <span className="sd-topbar-brand">Sweet Disorder Ops</span>
        <span className="sd-topbar-surface">{SURFACE_LABELS[surface]}</span>
      </header>
      <main className="sd-main">
        <div className="sd-card">
          <h1>{SURFACE_LABELS[surface]} - coming soon</h1>
          <p>{description}</p>
          {signedInAs ? (
            <p>
              Signed in as <strong>{signedInAs}</strong>. <LogoutButton />
            </p>
          ) : (
            <p>
              Not signed in. <a href={loginHref}>Sign in</a>
            </p>
          )}
          <p className="sd-note">
            Currently serving {SURFACE_SUBDOMAINS[surface]}.sweetdisorder.co.nz
            (or ?surface={surface} locally). Stage 1 sets up the shared
            foundation - routing, database, and auth - this surface&apos;s
            real UI is built in a later stage.
          </p>
          <div className="sd-pill-row">
            {SURFACES.map((s) => (
              <a key={s} href={`/?surface=${s}`}>
                {SURFACE_LABELS[s]}
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
