import { redirect } from "next/navigation";
import Link from "next/link";
import { Candy, ClipboardList } from "lucide-react";
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
        title={`Welcome back, ${customer.companyName}`}
        subtitle={`Hi ${customer.contactName.split(" ")[0]}, here's what's happening with your account.`}
        hero
      />
      <div className="sd-portal-body">
        <ReorderShortcuts suggestions={suggestions} />

        <div className="sd-home-section">
          <h2>Get started</h2>
          <div className="sd-home-links">
            <Link className="sd-station-button" href="/catalog">
              <Candy aria-hidden="true" />
              Browse catalog
            </Link>
            <Link className="sd-station-button" href="/orders">
              <ClipboardList aria-hidden="true" />
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
