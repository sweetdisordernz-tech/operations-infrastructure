import type { UserRole } from "@prisma/client";
import { getCurrentUser, getCurrentWholesaleCustomer } from "@/lib/auth/current-user";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/**
 * For staff-surface (admin/ops/floor) API routes and pages. Reads only the
 * staff session cookie - a wholesale-customer session never satisfies this,
 * so wholesale sessions are structurally rejected here, not just by
 * convention.
 */
export async function requireStaffUser(allowedRoles?: UserRole[]) {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Staff sign-in required");
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new AuthError("Not authorized for this role", 403);
  }
  return user;
}

/**
 * For the wholesale-surface API routes and pages. Reads only the wholesale
 * session cookie - a staff session never satisfies this, so staff sessions
 * are structurally rejected here, not just by convention.
 */
export async function requireWholesaleCustomer() {
  const customer = await getCurrentWholesaleCustomer();
  if (!customer) throw new AuthError("Wholesale customer sign-in required");
  return customer;
}
