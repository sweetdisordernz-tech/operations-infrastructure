import { redirect } from "next/navigation";
import { getCurrentWholesaleCustomer } from "@/lib/auth/current-user";
import { getWholesaleCatalog } from "@/lib/wholesale/catalog";
import { CartView } from "@/app/_components/cart-view";
import { PortalBottomNav } from "@/app/_components/portal-bottom-nav";
import { PortalHeader } from "@/app/_components/portal-header";
import { PortalFooter } from "@/app/_components/portal-footer";

export default async function CartPage() {
  const customer = await getCurrentWholesaleCustomer();
  if (!customer) redirect("/login");
  const catalog = await getWholesaleCatalog(customer);

  return (
    <div className="sd-portal-shell">
      <PortalHeader companyName={customer.companyName} title="Your cart" />
      <div className="sd-portal-body">
        <CartView catalog={catalog} shipsToBothRegions={customer.shipsToBothRegions} />
      </div>
      <PortalFooter />
      <PortalBottomNav />
    </div>
  );
}
