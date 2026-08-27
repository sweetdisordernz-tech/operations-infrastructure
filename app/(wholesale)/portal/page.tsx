import { ComingSoon } from "@/app/_components/coming-soon";
import { getCurrentWholesaleCustomer } from "@/lib/auth/current-user";

export default async function WholesalePortalHome() {
  const customer = await getCurrentWholesaleCustomer();

  return (
    <ComingSoon
      surface="wholesale"
      description="The B2B wholesale customer portal - browse the catalog, place orders, and track order status."
      loginHref="/login"
      signedInAs={customer ? `${customer.companyName} (${customer.email})` : null}
    />
  );
}
