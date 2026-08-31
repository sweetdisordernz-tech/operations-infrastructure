import { redirect } from "next/navigation";
import { getCurrentWholesaleCustomer } from "@/lib/auth/current-user";
import { CartProvider } from "@/app/_components/cart-context";

// Always render per-request (never statically prerendered at build time) -
// this page shows live per-customer, per-request business data regardless
// of how the current customer is resolved.
export const dynamic = "force-dynamic";

export default async function AuthenticatedPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const customer = await getCurrentWholesaleCustomer();
  if (!customer) redirect("/login");

  return (
    <CartProvider customerId={customer.id} defaultRegion={customer.region}>
      {children}
    </CartProvider>
  );
}
