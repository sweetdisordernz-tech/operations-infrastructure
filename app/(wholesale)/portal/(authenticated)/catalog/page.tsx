import { redirect } from "next/navigation";
import { getCurrentWholesaleCustomer } from "@/lib/auth/current-user";
import { getWholesaleCatalog } from "@/lib/wholesale/catalog";
import { CatalogBrowser } from "@/app/_components/catalog-browser";
import { PortalBottomNav } from "@/app/_components/portal-bottom-nav";
import { PortalHeader } from "@/app/_components/portal-header";
import { PortalFooter } from "@/app/_components/portal-footer";

export default async function CatalogPage() {
  const customer = await getCurrentWholesaleCustomer();
  if (!customer) redirect("/login");
  const catalog = await getWholesaleCatalog(customer);

  return (
    <div className="sd-portal-shell">
      <PortalHeader companyName={customer.companyName} title="Catalog" subtitle={`Your prices, ${customer.companyName}`} />
      <div className="sd-portal-body">
        <CatalogBrowser catalog={catalog} />
      </div>
      <PortalFooter />
      <PortalBottomNav />
    </div>
  );
}
