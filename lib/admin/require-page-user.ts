import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { User } from "@prisma/client";

/**
 * Master Connect is OWNER_ADMIN-only (brief Section 9). Reused at the top of
 * the authenticated layout AND every top-level page - Next can render a
 * layout and its page concurrently, so a page's own data fetch can still
 * run (assuming a valid session) before the layout's redirect takes effect;
 * this is the same defensive double-check the wholesale portal uses.
 */
export async function requireAdminPageUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER_ADMIN") {
    redirect("/login");
  }
  return user;
}
