"use server";

import { requireStaffUser } from "@/lib/auth/guards";
import { completeLabellingBatch } from "@/lib/tasks/labelling";

export async function completeLabellingBatchAction(formData: FormData) {
  const user = await requireStaffUser();

  const productId = formData.get("productId");
  if (typeof productId !== "string" || !productId) {
    throw new Error("Missing productId");
  }

  await completeLabellingBatch(productId, user.id);
}
