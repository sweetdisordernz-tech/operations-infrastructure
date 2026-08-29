"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffUser } from "@/lib/auth/guards";
import { createSupplier, updateSupplier, deleteSupplier, type SupplierInput } from "@/lib/admin/suppliers";
import { toActionResult } from "@/lib/to-action-result";
import type { ActionResult } from "@/lib/action-result";

function readInput(formData: FormData): SupplierInput {
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const contactPhone = String(formData.get("contactPhone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const leadTimeRaw = String(formData.get("leadTimeDays") ?? "").trim();

  return {
    name: String(formData.get("name") ?? ""),
    contactEmail: contactEmail || null,
    contactPhone: contactPhone || null,
    leadTimeDays: leadTimeRaw ? Number(leadTimeRaw) : null,
    notes: notes || null,
  };
}

export async function createSupplierAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    await createSupplier(readInput(formData));
    revalidatePath("/suppliers");
  } catch (err) {
    return toActionResult(err);
  }
  redirect("/suppliers");
}

export async function updateSupplierAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const id = String(formData.get("id") ?? "");
    await updateSupplier(id, readInput(formData));
    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${id}`);
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}

export async function deleteSupplierAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const id = String(formData.get("id") ?? "");
    await deleteSupplier(id);
    revalidatePath("/suppliers");
  } catch (err) {
    return toActionResult(err);
  }
  redirect("/suppliers");
}
