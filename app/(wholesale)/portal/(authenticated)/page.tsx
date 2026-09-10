import { redirect } from "next/navigation";
import Link from "next/link";
import { Candy, ClipboardList, ArrowRight } from "lucide-react";
import { getCurrentWholesaleCustomer } from "@/lib/auth/current-user";
import { getWholesaleCatalog } from "@/lib/wholesale/catalog";
import { getReorderSuggestions } from "@/lib/wholesale/reorder";
import { ReorderShortcuts } from "@/app/_components/reorder-shortcuts";
import { PortalBottomNav } from "@/app/_components/portal-bottom-nav";
import { PortalHeader } from "@/app/_components/portal-header";
import { PortalFooter } from "@/app/_components/portal-footer";

export default async function PortalHome() {
  // Don't just trust the layout's redirect - Next can render a layout and
  // its page concurrently, so this page's own data fetch can still run
  // (and see no session) before the layout's redirect takes effect.
  const customer = await getCurrentWholesaleCustomer();
  if (!customer) redirect("/login");
  const catalog = await getWholesaleCatalog(customer);
  const suggestions = await getReorderSuggestions(customer.id, catalog);

  return (
    <div className="sd-portal-shell">
      <PortalHeader
        companyName={customer.companyName}
        title="Welcome back,"
        heroAccent={customer.companyName}
        subtitle={`Hi ${customer.contactName.split(" ")[0]}, here's what's happening with your account.`}
        hero
      />
      <div className="sd-portal-body">
        <ReorderShortcuts suggestions={suggestions} />

        <div className="sd-home-section">
          <h2>Get started</h2>
          <p className="sd-script-accent sd-home-tagline">let&apos;s find your next favourite</p>
          <div className="sd-home-hero-actions">
            <Link className="sd-home-hero-primary" href="/catalog">
              <span className="sd-home-hero-primary-icon">
                <Candy aria-hidden="true" />
              </span>
              <span className="sd-home-hero-primary-text">
                <span className="sd-home-hero-primary-title">Browse the catalog</span>
                <span className="sd-home-hero-primary-sub">
                  {catalog.products.length} products at your prices
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="sd-home-hero-primary-arrow" />
            </Link>
            <Link className="sd-home-hero-secondary" href="/orders">
              <ClipboardList aria-hidden="true" size={18} />
              Order history
            </Link>
          </div>
        </div>
      </div>
      <PortalFooter />
      <PortalBottomNav />
    </div>
  );
}
