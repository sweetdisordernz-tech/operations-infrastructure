"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffUser } from "@/lib/auth/guards";
import { createProduct, createRange, createFilling, type ProductInput } from "@/lib/admin/products";
import { adjustInventoryQuantity } from "@/lib/admin/inventory";
import { toActionResult } from "@/lib/to-action-result";
import type { ActionResult } from "@/lib/action-result";
import type { PackagingType } from "@prisma/client";

const NEW_SENTINEL = "__new__";

/** Same inline-create resolution as Master Connect's product form (lib/admin/products.ts) - not duplicated, just reused from a different action file since redirects/revalidate targets differ per surface. */
async function resolveProductInput(formData: FormData): Promise<ProductInput> {
  let rangeId = String(formData.get("rangeId") ?? "");
  if (rangeId === NEW_SENTINEL) {
    const range = await createRange(String(formData.get("newRangeName") ?? ""), String(formData.get("newRangeSkuPrefix") ?? ""));
    rangeId = range.id;
  }

  let fillingId: string | null = String(formData.get("fillingId") ?? "") || null;
  if (fillingId === NEW_SENTINEL) {
    const filling = await createFilling(String(formData.get("newFillingName") ?? ""));
    fillingId = filling.id;
  }

  const skuRaw = String(formData.get("sku") ?? "").trim();
  const barcodeRaw = String(formData.get("barcode") ?? "").trim();
  const imageRaw = String(formData.get("imageBlobUrl") ?? "").trim();

  return {
    name: String(formData.get("name") ?? ""),
    rangeId,
    packagingType: String(formData.get("packagingType") ?? "") as PackagingType,
    fillingId,
    sku: skuRaw || null,
    barcode: barcodeRaw || null,
    minOrderQty: Number(formData.get("minOrderQty")),
    imageBlobUrl: imageRaw || null,
    wholesaleVisible: formData.get("wholesaleVisible") === "on",
    active: true,
    discontinued: false,
  };
}

export async function createProductAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const input = await resolveProductInput(formData);
    await createProduct(input);
    revalidatePath("/inventory");
  } catch (err) {
    return toActionResult(err);
  }
  redirect("/inventory");
}

export async function adjustStockAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireStaffUser(["OWNER_ADMIN"]);
    const inventoryItemId = String(formData.get("inventoryItemId") ?? "");
    const newQuantity = Number(formData.get("newQuantity"));
    await adjustInventoryQuantity(inventoryItemId, newQuantity, user.id, null);
    revalidatePath("/inventory");
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}
