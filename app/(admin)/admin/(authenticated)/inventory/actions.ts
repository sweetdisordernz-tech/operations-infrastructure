"use server";

import { requireStaffUser } from "@/lib/auth/guards";
import { adjustInventoryQuantity } from "@/lib/admin/inventory";
import { toActionResult } from "@/lib/to-action-result";
import type { ActionResult } from "@/lib/action-result";

export async function adjustStockAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireStaffUser(["OWNER_ADMIN"]);

    const inventoryItemId = String(formData.get("inventoryItemId") ?? "");
    const newQuantity = Number(formData.get("newQuantity"));
    const reasonRaw = String(formData.get("reason") ?? "").trim();

    await adjustInventoryQuantity(inventoryItemId, newQuantity, user.id, reasonRaw || null);
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}
