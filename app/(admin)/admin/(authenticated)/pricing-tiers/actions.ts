"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffUser } from "@/lib/auth/guards";
import {
  createPricingTier,
  updatePricingTier,
  deletePricingTier,
  setTierProductPrice,
  removeTierProductPrice,
} from "@/lib/admin/pricing-tiers";
import { toActionResult } from "@/lib/to-action-result";
import type { ActionResult } from "@/lib/action-result";
import type { Region } from "@prisma/client";

export async function createPricingTierAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  let newId: string;
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const tier = await createPricingTier(String(formData.get("name") ?? ""), String(formData.get("region") ?? "") as Region);
    revalidatePath("/pricing-tiers");
    newId = tier.id;
  } catch (err) {
    return toActionResult(err);
  }
  redirect(`/pricing-tiers/${newId}`);
}

export async function updatePricingTierAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const id = String(formData.get("id") ?? "");
    await updatePricingTier(id, String(formData.get("name") ?? ""), String(formData.get("region") ?? "") as Region);
    revalidatePath("/pricing-tiers");
    revalidatePath(`/pricing-tiers/${id}`);
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}

export async function deletePricingTierAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const id = String(formData.get("id") ?? "");
    await deletePricingTier(id);
    revalidatePath("/pricing-tiers");
  } catch (err) {
    return toActionResult(err);
  }
  redirect("/pricing-tiers");
}

export async function setTierProductPriceAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const pricingTierId = String(formData.get("pricingTierId") ?? "");
    const productId = String(formData.get("productId") ?? "");
    const price = Number(formData.get("price"));
    await setTierProductPrice(pricingTierId, productId, price);
    revalidatePath(`/pricing-tiers/${pricingTierId}`);
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}

export async function removeTierProductPriceAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const pricingTierId = String(formData.get("pricingTierId") ?? "");
    const productId = String(formData.get("productId") ?? "");
    await removeTierProductPrice(pricingTierId, productId);
    revalidatePath(`/pricing-tiers/${pricingTierId}`);
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}
