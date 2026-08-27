import { AuthError } from "@/lib/auth/guards";
import { TaskGatingError } from "@/lib/tasks/shared";
import { OrderValidationError } from "@/lib/orders/create-order";
import { CheckoutError } from "@/lib/wholesale/checkout";
import type { ActionResult } from "@/lib/action-result";

/**
 * Maps a caught error to a clean, user-facing ActionResult. Known error
 * types (gating violations, order validation, auth) surface their own
 * message since those are already written to be shown to a user; anything
 * else is logged server-side and replaced with a generic message so
 * internal details never leak to the client.
 *
 * Server-only (transitively imports Prisma/auth) - import this from
 * "use server" action files only, never from a client component. Client
 * components that just need the ActionResult type/initial value should
 * import lib/action-result.ts directly instead.
 */
export function toActionResult(err: unknown): ActionResult {
  if (
    err instanceof TaskGatingError ||
    err instanceof OrderValidationError ||
    err instanceof AuthError ||
    err instanceof CheckoutError
  ) {
    return { ok: false, error: err.message };
  }
  console.error("Server action failed:", err);
  return { ok: false, error: "Something went wrong. Please try again." };
}
