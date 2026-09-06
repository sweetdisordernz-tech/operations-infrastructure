import { ShoppingBag, LayoutDashboard, Home, ClipboardCheck, ArrowRight, type LucideIcon } from "lucide-react";
import type { Surface } from "@/lib/subdomains";

type SurfaceCard = {
  surface: Surface;
  label: string;
  description: string;
  icon: LucideIcon;
};

const SURFACE_CARDS: SurfaceCard[] = [
  {
    surface: "wholesale",
    label: "Wholesale Portal",
    description: "Browse the catalog and place wholesale orders.",
    icon: ShoppingBag,
  },
  {
    surface: "admin",
    label: "Master Connect",
    description: "Full operational control - inventory, compliance, pricing, and more.",
    icon: LayoutDashboard,
  },
  {
    surface: "ops",
    label: "Owner Dashboard",
    description: "Molly's simplified daily view of what needs attention.",
    icon: Home,
  },
  {
    surface: "floor",
    label: "Floor Tasks",
    description: "Labelling, packing, and dispatch tasks for the production floor.",
    icon: ClipboardCheck,
  },
];

/**
 * Rendered only when the request's host doesn't match a known subdomain and
 * no sd-surface cookie is set (yet, or not any more - see
 * middleware.ts's /switch-app handling) - bare localhost, a Vercel preview
 * URL, or the root domain before DNS is connected. In production each
 * surface will live on its own real subdomain and never touch this page;
 * until then, this is the one entry point into all four, so it's built to
 * the same design standard as everything downstream of it rather than as
 * a bare debug menu - real logo mark, real icons, real copy.
 */
export default function RootFallbackPage() {
  return (
    <div className="sd-picker-shell">
      <span className="sd-picker-logo">Sweet Disorder</span>
      <div className="sd-picker-intro">
        <h1>Choose an app</h1>
        <p>
          In production each surface lives on its own subdomain. For local dev and preview
          deployments, pick one below - it sets a cookie so you don&apos;t need real DNS.
        </p>
      </div>
      <nav className="sd-picker-grid" aria-label="Choose a surface">
        {SURFACE_CARDS.map(({ surface, label, description, icon: Icon }) => (
          <a key={surface} className="sd-picker-card" href={`/?surface=${surface}`}>
            <span className="sd-picker-card-icon">
              <Icon aria-hidden="true" />
            </span>
            <h2>{label}</h2>
            <p>{description}</p>
            <span className="sd-picker-card-cta">
              Enter {label}
              <ArrowRight size={14} aria-hidden="true" />
            </span>
          </a>
        ))}
      </nav>
    </div>
  );
}
