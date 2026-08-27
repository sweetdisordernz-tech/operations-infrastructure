import { redirect } from "next/navigation";
import { getCurrentWholesaleCustomer } from "@/lib/auth/current-user";
import { CartProvider } from "@/app/_components/cart-context";

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
