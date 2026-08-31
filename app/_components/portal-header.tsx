import Link from "next/link";
import { PortalDesktopNav } from "@/app/_components/portal-desktop-nav";

/**
 * Desktop-only top bar (logo, nav, company name) plus the per-page
 * title/subtitle every portal page already had. The top bar is hidden on
 * mobile via CSS - PortalBottomNav covers navigation there instead.
 *
 * Logo: the real sweetdisorder.co.nz logo couldn't be fetched (network
 * blocked in the build environment) and no file has been supplied yet, so
 * this renders a styled text mark instead of fabricating a placeholder
 * image. Swap the <span className="sd-portal-logo-mark"> below for
 * `<img src="/sweet-disorder-logo.png" alt="Sweet Disorder" />` once a real
 * logo file is added to /public.
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
          Sweet Disorder
        </Link>
        <PortalDesktopNav />
        <span className="sd-portal-company-chip">{companyName}</span>
      </header>
      <div className={hero ? "sd-portal-hero" : "sd-portal-header"}>
        {hero && <span className="sd-portal-hero-mark">Sweet Disorder</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </>
  );
}
