"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffUser } from "@/lib/auth/guards";
import { createLead, updateLead, deleteLead, moveLeadStage, type LeadInput } from "@/lib/sales/pipeline";
import { uploadOnePager } from "@/lib/sales/one-pager";
import { toActionResult } from "@/lib/to-action-result";
import type { ActionResult } from "@/lib/action-result";
import type { LeadSegment, SalesLeadStage } from "@prisma/client";

function readLeadInput(formData: FormData): LeadInput {
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  const nextAction = String(formData.get("nextAction") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const nextActionDateRaw = String(formData.get("nextActionDate") ?? "").trim();
  const lastTouchDateRaw = String(formData.get("lastTouchDate") ?? "").trim();
  const estValueRaw = String(formData.get("estOrderValueNzd") ?? "").trim();

  return {
    companyName: String(formData.get("companyName") ?? ""),
    contactName: contactName || null,
    email: email || null,
    phone: phone || null,
    segment: String(formData.get("segment") ?? "") as LeadSegment,
    stage: String(formData.get("stage") ?? "") as SalesLeadStage,
    source: source || null,
    nextActionDate: nextActionDateRaw ? new Date(`${nextActionDateRaw}T00:00:00.000Z`) : null,
    nextAction: nextAction || null,
    estOrderValueNzd: estValueRaw ? Number(estValueRaw) : null,
    notes: notes || null,
    lastTouchDate: lastTouchDateRaw ? new Date(`${lastTouchDateRaw}T00:00:00.000Z`) : null,
  };
}

export async function createLeadAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  let newId: string;
  try {
    const user = await requireStaffUser(["OWNER_ADMIN"]);
    const lead = await createLead(readLeadInput(formData), user.id);
    revalidatePath("/sales");
    newId = lead.id;
  } catch (err) {
    return toActionResult(err);
  }
  redirect(`/sales/leads/${newId}`);
}

export async function updateLeadAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const id = String(formData.get("id") ?? "");
    await updateLead(id, readLeadInput(formData));
    revalidatePath("/sales");
    revalidatePath(`/sales/leads/${id}`);
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}

export async function deleteLeadAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const id = String(formData.get("id") ?? "");
    await deleteLead(id);
    revalidatePath("/sales");
  } catch (err) {
    return toActionResult(err);
  }
  redirect("/sales");
}

export async function moveLeadStageAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const id = String(formData.get("id") ?? "");
    const stage = String(formData.get("stage") ?? "") as SalesLeadStage;
    await moveLeadStage(id, stage);
    revalidatePath("/sales");
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}

export async function uploadOnePagerAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: "Choose a file to upload." };
    }
    await uploadOnePager(file);
    revalidatePath("/sales");
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}
