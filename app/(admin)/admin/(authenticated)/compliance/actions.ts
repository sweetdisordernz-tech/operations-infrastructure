"use server";

import { revalidatePath } from "next/cache";
import { requireStaffUser } from "@/lib/auth/guards";
import { updateComplianceRecord } from "@/lib/admin/label-compliance";
import { toActionResult } from "@/lib/to-action-result";
import type { ActionResult } from "@/lib/action-result";
import type {
  AllergenStatus,
  AddressStatus,
  CountryOfOriginStatus,
  NutritionBoxStatus,
  LabelUrgency,
} from "@prisma/client";

export async function updateComplianceAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);

    const id = String(formData.get("id") ?? "");
    const labelsRaw = String(formData.get("labelsInStock") ?? "").trim();
    const notesRaw = String(formData.get("allergenNotes") ?? "").trim();

    await updateComplianceRecord(id, {
      allergenStatus: String(formData.get("allergenStatus")) as AllergenStatus,
      allergenNotes: notesRaw || null,
      addressStatus: String(formData.get("addressStatus")) as AddressStatus,
      countryOfOriginStatus: String(formData.get("countryOfOriginStatus")) as CountryOfOriginStatus,
      nutritionBoxStatus: String(formData.get("nutritionBoxStatus")) as NutritionBoxStatus,
      labelsInStock: labelsRaw ? Number(labelsRaw) : null,
      urgency: String(formData.get("urgency")) as LabelUrgency,
    });

    revalidatePath("/compliance");
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}
