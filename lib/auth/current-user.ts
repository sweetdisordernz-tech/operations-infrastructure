import { prisma } from "@/lib/db";
import {
  readSessionSubject,
  STAFF_SESSION_COOKIE,
  WHOLESALE_SESSION_COOKIE,
} from "@/lib/auth/session";
import type { User, WholesaleCustomer } from "@prisma/client";

/**
 * Reads the staff session cookie and loads the corresponding User.
 * Returns null if there's no session, the token is invalid, or the user
 * has been deactivated - callers never need to separately check `active`.
 */
export async function getCurrentUser(): Promise<User | null> {
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
  const customerId = await readSessionSubject(WHOLESALE_SESSION_COOKIE);
  if (!customerId) return null;

  return prisma.wholesaleCustomer.findUnique({ where: { id: customerId } });
}
