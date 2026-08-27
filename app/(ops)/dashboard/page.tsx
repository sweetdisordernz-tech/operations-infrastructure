import { ComingSoon } from "@/app/_components/coming-soon";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function OpsHome() {
  const user = await getCurrentUser();

  return (
    <ComingSoon
      surface="ops"
      description="Molly's simplified daily-use dashboard - a quick-glance view of what needs attention today."
      loginHref="/login"
      signedInAs={user ? `${user.name} (${user.role})` : null}
    />
  );
}
