"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffUser } from "@/lib/auth/guards";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  createRange,
  createFilling,
  getProduct,
  type ProductInput,
} from "@/lib/admin/products";
import { toActionResult } from "@/lib/to-action-result";
import type { ActionResult } from "@/lib/action-result";
import type { PackagingType } from "@prisma/client";

const NEW_SENTINEL = "__new__";

/** Resolves the submitted range/filling choice, creating a new one inline if the "+ Add new..." option was picked. */
async function resolveProductInput(formData: FormData): Promise<ProductInput> {
  let rangeId = String(formData.get("rangeId") ?? "");
  if (rangeId === NEW_SENTINEL) {
    const name = String(formData.get("newRangeName") ?? "");
    const skuPrefix = String(formData.get("newRangeSkuPrefix") ?? "");
    const range = await createRange(name, skuPrefix);
    rangeId = range.id;
  }

  let fillingId: string | null = String(formData.get("fillingId") ?? "") || null;
  if (fillingId === NEW_SENTINEL) {
    const name = String(formData.get("newFillingName") ?? "");
    const filling = await createFilling(name);
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
    active: formData.get("active") === "on",
    discontinued: formData.get("discontinued") === "on",
  };
}

export async function createProductAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  let newProductId: string;
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const input = await resolveProductInput(formData);
    const product = await createProduct(input);
    revalidatePath("/products");
    newProductId = product.id;
  } catch (err) {
    // redirect() below throws internally - it must never run inside this
    // try/catch, or its own throw would be caught and mistaken for a
    // real error by toActionResult.
    return toActionResult(err);
  }
  redirect(`/products/${newProductId}`);
}

export async function updateProductAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const id = String(formData.get("id") ?? "");
    const input = await resolveProductInput(formData);
    await updateProduct(id, input);
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}

export async function deleteProductAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const id = String(formData.get("id") ?? "");
    await deleteProduct(id);
    revalidatePath("/products");
  } catch (err) {
    return toActionResult(err);
  }
  redirect("/products");
}

/** Quick inline toggle for wholesale_visible / active from the list table, without opening the full edit form. */
export async function toggleProductFlagAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const id = String(formData.get("id") ?? "");
    const field = String(formData.get("field") ?? "");
    const value = formData.get("value") === "true";

    if (field !== "wholesaleVisible" && field !== "active") {
      throw new Error("Unsupported field");
    }

    const existing = await getProduct(id);
    if (!existing) return { ok: false, error: "That product no longer exists." };

    await updateProduct(id, {
      name: existing.name,
      rangeId: existing.rangeId,
      packagingType: existing.packagingType,
      fillingId: existing.fillingId,
      sku: existing.sku,
      barcode: existing.barcode,
      minOrderQty: existing.minOrderQty,
      imageBlobUrl: existing.imageBlobUrl,
      wholesaleVisible: field === "wholesaleVisible" ? value : existing.wholesaleVisible,
      active: field === "active" ? value : existing.active,
      discontinued: existing.discontinued,
    });

    revalidatePath("/products");
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}
