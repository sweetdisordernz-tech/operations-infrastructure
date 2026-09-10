import Link from "next/link";
import { PortalDesktopNav } from "@/app/_components/portal-desktop-nav";

/**
 * Desktop-only top bar (logo, nav, company name) plus the per-page
 * title/subtitle every portal page already had. The top bar is hidden on
 * mobile via CSS - PortalBottomNav covers navigation there instead.
 */
export function PortalHeader({
  companyName,
  title,
  subtitle,
  hero = false,
}: {
  companyName: string;
  title: string;
  subtitle?: string;
  /** Home page only: renders the title as a large hero headline instead of the standard page-title size. */
  hero?: boolean;
}) {
  return (
    <>
      <header className="sd-portal-topbar">
        <Link href="/" className="sd-portal-logo-mark">
          <img src="/sweet-disorder-logo.png" alt="Sweet Disorder" />
        </Link>
        <PortalDesktopNav />
        <span className="sd-portal-company-chip">{companyName}</span>
      </header>
      <div className={hero ? "sd-portal-hero" : "sd-portal-header"}>
        {hero && (
          <img className="sd-portal-hero-mark" src="/sweet-disorder-logo.png" alt="Sweet Disorder" />
        )}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </>
  );
}
