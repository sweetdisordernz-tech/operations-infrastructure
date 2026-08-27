"use server";

import { requireStaffUser } from "@/lib/auth/guards";
import { completePackingTask } from "@/lib/tasks/packing";
import type { ActionResult } from "@/lib/action-result";
import { toActionResult } from "@/lib/to-action-result";

export async function completePackingAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireStaffUser();

    const orderId = formData.get("orderId");
    if (typeof orderId !== "string" || !orderId) {
      return { ok: false, error: "Missing order" };
    }

    await completePackingTask(orderId, user.id);
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}
