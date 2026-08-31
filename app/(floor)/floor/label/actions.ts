"use server";

import { revalidatePath } from "next/cache";
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
    // The floor subdomain serves this page at the bare path via a
    // middleware rewrite, while dev/test tooling hits it at /floor/label
    // directly - revalidate both so the same-tab UI (task, photo, and the
    // completed-today count) actually refreshes after a "mark done" tap
    // instead of showing the just-completed task until a manual reload.
    revalidatePath("/label");
    revalidatePath("/floor/label");
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}
