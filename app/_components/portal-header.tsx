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
  heroAccent,
  subtitle,
  hero = false,
}: {
  companyName: string;
  title: string;
  /**
   * Hero only: a short piece of the headline (the personalized bit, e.g.
   * the company's name) rendered in the script accent face instead of the
   * heading font - one of the portal's few deliberate script moments, see
   * .sd-script-accent in globals.css. Ignored outside hero mode.
   */
  heroAccent?: string;
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
          <>
            <img className="sd-portal-hero-mark" src="/sweet-disorder-logo.png" alt="Sweet Disorder" />
            {/*
              Decorative seal, not a real wax stamp - a small nod to the
              round badge mark on the actual product labels (see
              public/product-images/), reusing its real tagline copy so
              it reads as an extension of the brand rather than an
              invented one. Purely decorative, so it's hidden from
              assistive tech rather than announced as content.
            */}
            <span className="sd-hero-seal" aria-hidden="true">
              <span>A sprinkle of</span>
              <strong>happiness</strong>
            </span>
          </>
        )}
        <h1>
          {title}
          {hero && heroAccent && <span className="sd-script-accent sd-hero-accent"> {heroAccent}</span>}
        </h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </>
  );
}
