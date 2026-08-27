"use server";

import { requireStaffUser } from "@/lib/auth/guards";
import { completeLabellingBatch } from "@/lib/tasks/labelling";
import type { ActionResult } from "@/lib/action-result";
import { toActionResult } from "@/lib/to-action-result";

export async function completeLabellingBatchAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireStaffUser();

    const productId = formData.get("productId");
    if (typeof productId !== "string" || !productId) {
      return { ok: false, error: "Missing product" };
    }

    await completeLabellingBatch(productId, user.id);
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}
