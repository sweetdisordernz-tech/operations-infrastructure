import { redirect } from "next/navigation";
import { getCurrentWholesaleCustomer } from "@/lib/auth/current-user";
import { getWholesaleCatalog } from "@/lib/wholesale/catalog";
import { CatalogBrowser } from "@/app/_components/catalog-browser";
import { PortalBottomNav } from "@/app/_components/portal-bottom-nav";

export default async function CatalogPage() {
  const customer = await getCurrentWholesaleCustomer();
  if (!customer) redirect("/login");
  const catalog = await getWholesaleCatalog(customer);

  return (
    <div className="sd-portal-shell">
      <div className="sd-portal-header">
        <h1>Catalog</h1>
        <p>Your prices, {customer.companyName}</p>
      </div>
      <div className="sd-portal-body">
        <CatalogBrowser catalog={catalog} />
      </div>
      <PortalBottomNav />
    </div>
  );
}
