import { ComingSoon } from "@/app/_components/coming-soon";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function FloorHome() {
  const user = await getCurrentUser();

  return (
    <ComingSoon
      surface="floor"
      description="The minimal task checklist app for production/floor staff labelling and packing physical product."
      loginHref="/login"
      signedInAs={user ? user.name : null}
    />
  );
}
