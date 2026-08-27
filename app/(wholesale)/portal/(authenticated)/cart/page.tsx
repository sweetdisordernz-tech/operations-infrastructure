import { redirect } from "next/navigation";
import { getCurrentWholesaleCustomer } from "@/lib/auth/current-user";
import { getWholesaleCatalog } from "@/lib/wholesale/catalog";
import { CartView } from "@/app/_components/cart-view";
import { PortalBottomNav } from "@/app/_components/portal-bottom-nav";

export default async function CartPage() {
  const customer = await getCurrentWholesaleCustomer();
  if (!customer) redirect("/login");
  const catalog = await getWholesaleCatalog(customer);

  return (
    <div className="sd-portal-shell">
      <div className="sd-portal-header">
        <h1>Your cart</h1>
      </div>
      <div className="sd-portal-body">
        <CartView catalog={catalog} shipsToBothRegions={customer.shipsToBothRegions} />
      </div>
      <PortalBottomNav />
    </div>
  );
}
