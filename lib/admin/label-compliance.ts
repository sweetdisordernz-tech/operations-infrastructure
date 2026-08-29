import { prisma } from "@/lib/db";
import { AdminValidationError } from "@/lib/admin/errors";
import { sendLabelComplianceAlertEmail } from "@/lib/email";
import type {
  AllergenStatus,
  AddressStatus,
  CountryOfOriginStatus,
  NutritionBoxStatus,
  LabelUrgency,
} from "@prisma/client";

/**
 * The label & packaging compliance worklist (brief Section 5.2/9/12) -
 * every LabelComplianceRecord, sorted by urgency so reprints get
 * prioritized correctly: TOP_PRIORITY_URGENT -> URGENT_CHANGE_NEEDED ->
 * CHANGE_NEEDED_NOT_URGENT -> NO_CHANGE_NEEDED.
 */

export const URGENCY_ORDER: LabelUrgency[] = [
  "TOP_PRIORITY_URGENT",
  "URGENT_CHANGE_NEEDED",
  "CHANGE_NEEDED_NOT_URGENT",
  "NO_CHANGE_NEEDED",
];

export type ComplianceWorklistRow = {
  id: string;
  productId: string;
  sku: string | null;
  productName: string;
  allergenStatus: AllergenStatus;
  allergenNotes: string | null;
  addressStatus: AddressStatus;
  countryOfOriginStatus: CountryOfOriginStatus;
  nutritionBoxStatus: NutritionBoxStatus;
  labelsInStock: number | null;
  urgency: LabelUrgency;
  lastReviewedAt: Date | null;
};

export async function getComplianceWorklist(): Promise<ComplianceWorklistRow[]> {
  const records = await prisma.labelComplianceRecord.findMany({
    include: { product: true },
  });

  const rows: ComplianceWorklistRow[] = records.map((record) => ({
    id: record.id,
    productId: record.productId,
    sku: record.product.sku,
    productName: record.product.name,
    allergenStatus: record.allergenStatus,
    allergenNotes: record.allergenNotes,
    addressStatus: record.addressStatus,
    countryOfOriginStatus: record.countryOfOriginStatus,
    nutritionBoxStatus: record.nutritionBoxStatus,
    labelsInStock: record.labelsInStock,
    urgency: record.urgency,
    lastReviewedAt: record.lastReviewedAt,
  }));

  return rows.sort((a, b) => {
    const urgencyDiff = URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency);
    return urgencyDiff !== 0 ? urgencyDiff : a.productName.localeCompare(b.productName);
  });
}

export type ComplianceUpdateInput = {
  allergenStatus: AllergenStatus;
  allergenNotes: string | null;
  addressStatus: AddressStatus;
  countryOfOriginStatus: CountryOfOriginStatus;
  nutritionBoxStatus: NutritionBoxStatus;
  labelsInStock: number | null;
  urgency: LabelUrgency;
};

/** Plain-English summary of everything currently flagged wrong, for the urgency alert email. */
function summarizeWhatsWrong(input: ComplianceUpdateInput): string {
  const issues: string[] = [];
  if (input.allergenStatus !== "CORRECT") {
    issues.push(`Allergen labelling (${input.allergenStatus})${input.allergenNotes ? `: ${input.allergenNotes}` : ""}`);
  }
  if (input.addressStatus !== "CORRECT") issues.push("Address is incorrect");
  if (input.countryOfOriginStatus !== "CORRECT") issues.push("Country of origin is incorrect");
  if (input.nutritionBoxStatus !== "CORRECT") issues.push(`Nutrition box (${input.nutritionBoxStatus})`);
  return issues.length > 0 ? issues.join("; ") : "Flagged top priority urgent";
}

/**
 * Updates a compliance record and, only on a genuine transition INTO
 * TOP_PRIORITY_URGENT (brief Section 6.4/12/14), alerts every active
 * OWNER_ADMIN user - never on an edit that leaves an already-top-priority
 * record at that same urgency, so routine re-saves don't re-alert.
 */
export async function updateComplianceRecord(id: string, input: ComplianceUpdateInput): Promise<void> {
  if (input.labelsInStock !== null && (!Number.isInteger(input.labelsInStock) || input.labelsInStock < 0)) {
    throw new AdminValidationError("Labels in stock must be a whole number of 0 or more, or left blank.");
  }

  const existing = await prisma.labelComplianceRecord.findUnique({ where: { id }, include: { product: true } });
  if (!existing) {
    throw new AdminValidationError("That compliance record no longer exists.");
  }

  const becameTopPriority = existing.urgency !== "TOP_PRIORITY_URGENT" && input.urgency === "TOP_PRIORITY_URGENT";

  await prisma.labelComplianceRecord.update({
    where: { id },
    data: { ...input, lastReviewedAt: new Date() },
  });

  if (becameTopPriority) {
    try {
      const admins = await prisma.user.findMany({ where: { role: "OWNER_ADMIN", active: true } });
      const whatsWrong = summarizeWhatsWrong(input);
      for (const admin of admins) {
        await sendLabelComplianceAlertEmail(admin.email, {
          sku: existing.product.sku,
          productName: existing.product.name,
          whatsWrong,
          labelsInStock: input.labelsInStock,
        });
      }
    } catch (err) {
      console.error(`Failed to send label-compliance urgency alert for record ${id}:`, err);
    }
  }
}
