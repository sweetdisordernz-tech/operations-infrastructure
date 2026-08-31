"use server";

import { revalidatePath } from "next/cache";
import { requireStaffUser } from "@/lib/auth/guards";
import { completeDispatchTask } from "@/lib/tasks/dispatch";
import type { ActionResult } from "@/lib/action-result";
import { toActionResult } from "@/lib/to-action-result";

export async function completeDispatchAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireStaffUser();

    const orderId = formData.get("orderId");
    if (typeof orderId !== "string" || !orderId) {
      return { ok: false, error: "Missing order" };
    }

    await completeDispatchTask(orderId, user.id);
    // See the matching comment in floor/label/actions.ts: without this the
    // same-tab UI keeps showing the just-completed order until a manual
    // reload, because the bare-path (subdomain) and /floor-prefixed (dev)
    // forms of this route need revalidating separately.
    revalidatePath("/dispatch");
    revalidatePath("/floor/dispatch");
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}
