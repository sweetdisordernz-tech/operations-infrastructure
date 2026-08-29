"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffUser } from "@/lib/auth/guards";
import { createCustomer, updateCustomer, deleteCustomer, type CustomerInput } from "@/lib/admin/customers";
import { toActionResult } from "@/lib/to-action-result";
import type { ActionResult } from "@/lib/action-result";
import type { Region } from "@prisma/client";

function readInput(formData: FormData): CustomerInput {
  const phone = String(formData.get("phone") ?? "").trim();
  const pricingTierId = String(formData.get("pricingTierId") ?? "").trim();

  return {
    companyName: String(formData.get("companyName") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: phone || null,
    region: String(formData.get("region") ?? "") as Region,
    shipsToBothRegions: formData.get("shipsToBothRegions") === "on",
    pricingTierId: pricingTierId || null,
  };
}

export async function createCustomerAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    await createCustomer(readInput(formData));
    revalidatePath("/customers");
  } catch (err) {
    return toActionResult(err);
  }
  redirect("/customers");
}

export async function updateCustomerAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const id = String(formData.get("id") ?? "");
    await updateCustomer(id, readInput(formData));
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}

export async function deleteCustomerAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const id = String(formData.get("id") ?? "");
    await deleteCustomer(id);
    revalidatePath("/customers");
  } catch (err) {
    return toActionResult(err);
  }
  redirect("/customers");
}
