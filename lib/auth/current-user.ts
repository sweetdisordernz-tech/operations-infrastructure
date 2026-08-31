import { prisma } from "@/lib/db";
import {
  readSessionSubject,
  STAFF_SESSION_COOKIE,
  WHOLESALE_SESSION_COOKIE,
} from "@/lib/auth/session";
import type { User, WholesaleCustomer } from "@prisma/client";

/**
 * TEMPORARY, explicitly requested bypass: magic-link email delivery isn't
 * reliably testable yet (Brevo/DNS still being set up), so all auth checks
 * are disabled for now to allow immediate access to all four surfaces
 * without signing in. This is the single chokepoint every page/API guard
 * funnels through (requireAdminPageUser, requireStaffUser,
 * requireWholesaleCustomer, and every floor page all call getCurrentUser()/
 * getCurrentWholesaleCustomer() below), so flipping this one flag back to
 * `false` restores real auth everywhere with no other code changes needed.
 *
 * Real security impact while this is `true`: anyone who finds the live URL
 * (the Vercel domain, or the custom subdomains once DNS is connected) has
 * full OWNER_ADMIN access to Master Connect, Owner Dashboard, and the Floor
 * app, and can act as the seeded demo wholesale customer on the portal -
 * no login required. Turn this back off before this app is meant to be
 * genuinely private again.
 */
const AUTH_DISABLED = true;

/**
 * Reads the staff session cookie and loads the corresponding User.
 * Returns null if there's no session, the token is invalid, or the user
 * has been deactivated - callers never need to separately check `active`.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (AUTH_DISABLED) {
    const fallbackAdmin = await prisma.user.findFirst({
      where: { email: "sweetdisordernz@gmail.com", active: true },
    });
    if (fallbackAdmin) return fallbackAdmin;
    return prisma.user.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } });
  }

  const userId = await readSessionSubject(STAFF_SESSION_COOKIE);
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) return null;
  return user;
}

/**
 * Reads the wholesale session cookie and loads the corresponding
 * WholesaleCustomer. Returns null if there's no session or the token is
 * invalid.
 */
export async function getCurrentWholesaleCustomer(): Promise<WholesaleCustomer | null> {
  if (AUTH_DISABLED) {
    return prisma.wholesaleCustomer.findFirst({ orderBy: { createdAt: "asc" } });
  }

  const customerId = await readSessionSubject(WHOLESALE_SESSION_COOKIE);
  if (!customerId) return null;

  return prisma.wholesaleCustomer.findUnique({ where: { id: customerId } });
}
