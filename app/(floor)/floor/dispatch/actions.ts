"use server";

import { requireStaffUser } from "@/lib/auth/guards";
import { completeDispatchTask } from "@/lib/tasks/dispatch";

export async function completeDispatchAction(formData: FormData) {
  const user = await requireStaffUser();

  const orderId = formData.get("orderId");
  if (typeof orderId !== "string" || !orderId) {
    throw new Error("Missing orderId");
  }

  await completeDispatchTask(orderId, user.id);
}
