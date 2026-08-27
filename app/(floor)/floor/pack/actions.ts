"use server";

import { requireStaffUser } from "@/lib/auth/guards";
import { completePackingTask } from "@/lib/tasks/packing";

export async function completePackingAction(formData: FormData) {
  const user = await requireStaffUser();

  const orderId = formData.get("orderId");
  if (typeof orderId !== "string" || !orderId) {
    throw new Error("Missing orderId");
  }

  await completePackingTask(orderId, user.id);
}
