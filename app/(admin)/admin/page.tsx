import { ComingSoon } from "@/app/_components/coming-soon";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function AdminHome() {
  const user = await getCurrentUser();

  return (
    <ComingSoon
      surface="admin"
      description="Master Connect - the internal admin dashboard for orders, inventory, label compliance, and sales leads."
      loginHref="/login"
      signedInAs={user ? `${user.name} (${user.role})` : null}
    />
  );
}
