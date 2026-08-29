"use server";

import { revalidatePath } from "next/cache";
import { requireStaffUser } from "@/lib/auth/guards";
import { addLabourLogEntry } from "@/lib/admin/employees";
import { toActionResult } from "@/lib/to-action-result";
import type { ActionResult } from "@/lib/action-result";

export async function addLabourLogAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);

    const employeeId = String(formData.get("employeeId") ?? "");
    const dateRaw = String(formData.get("date") ?? "");
    const hoursWorked = Number(formData.get("hoursWorked"));
    const notesRaw = String(formData.get("notes") ?? "").trim();

    await addLabourLogEntry({
      employeeId,
      date: new Date(`${dateRaw}T00:00:00.000Z`),
      hoursWorked,
      notes: notesRaw || null,
    });

    revalidatePath("/employees");
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}
