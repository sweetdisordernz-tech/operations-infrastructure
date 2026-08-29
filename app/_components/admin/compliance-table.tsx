"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";
import { updateComplianceAction } from "@/app/(admin)/admin/(authenticated)/compliance/actions";
import type { ComplianceWorklistRow } from "@/lib/admin/label-compliance";

const URGENCY_BADGE: Record<string, string> = {
  TOP_PRIORITY_URGENT: "sd-badge-danger",
  URGENT_CHANGE_NEEDED: "sd-badge-warning",
  CHANGE_NEEDED_NOT_URGENT: "sd-badge-info",
  NO_CHANGE_NEEDED: "sd-badge-success",
};

const URGENCY_LABEL: Record<string, string> = {
  TOP_PRIORITY_URGENT: "Top priority urgent",
  URGENT_CHANGE_NEEDED: "Urgent change needed",
  CHANGE_NEEDED_NOT_URGENT: "Change needed, not urgent",
  NO_CHANGE_NEEDED: "No change needed",
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="sd-btn sd-btn-primary sd-btn-sm" disabled={pending}>
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

function ComplianceRow({ row }: { row: ComplianceWorklistRow }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(updateComplianceAction, INITIAL_ACTION_RESULT);

  return (
    <tr>
      <td>
        <span className={`sd-badge ${URGENCY_BADGE[row.urgency]}`}>{URGENCY_LABEL[row.urgency]}</span>
      </td>
      <td>
        <div className="sd-table-name">{row.productName}</div>
        <div className="sd-table-sub">{row.sku ?? "No SKU yet"}</div>
      </td>
      <td colSpan={5}>
        <form action={formAction} className="sd-crud-grid" style={{ alignItems: "end" }}>
          <input type="hidden" name="id" value={row.id} />

          <div className="sd-field">
            <label>Urgency</label>
            <select name="urgency" defaultValue={row.urgency}>
              <option value="TOP_PRIORITY_URGENT">Top priority urgent</option>
              <option value="URGENT_CHANGE_NEEDED">Urgent change needed</option>
              <option value="CHANGE_NEEDED_NOT_URGENT">Change needed, not urgent</option>
              <option value="NO_CHANGE_NEEDED">No change needed</option>
            </select>
          </div>

          <div className="sd-field">
            <label>Allergen status</label>
            <select name="allergenStatus" defaultValue={row.allergenStatus}>
              <option value="CORRECT">Correct</option>
              <option value="NEEDS_CHANGE_URGENT">Needs change - urgent</option>
              <option value="NEEDS_CHANGE_NON_URGENT">Needs change - non urgent</option>
            </select>
          </div>

          <div className="sd-field">
            <label>Address status</label>
            <select name="addressStatus" defaultValue={row.addressStatus}>
              <option value="CORRECT">Correct</option>
              <option value="INCORRECT">Incorrect</option>
            </select>
          </div>

          <div className="sd-field">
            <label>Country of origin</label>
            <select name="countryOfOriginStatus" defaultValue={row.countryOfOriginStatus}>
              <option value="CORRECT">Correct</option>
              <option value="INCORRECT">Incorrect</option>
            </select>
          </div>

          <div className="sd-field">
            <label>Nutrition box</label>
            <select name="nutritionBoxStatus" defaultValue={row.nutritionBoxStatus}>
              <option value="CORRECT">Correct</option>
              <option value="NEEDS_COLUMN_ADDED">Needs column added</option>
              <option value="INCORRECT">Incorrect</option>
            </select>
          </div>

          <div className="sd-field">
            <label>Labels in stock</label>
            <input type="number" name="labelsInStock" min={0} defaultValue={row.labelsInStock ?? ""} placeholder="Unknown" />
          </div>

          <div className="sd-field" style={{ gridColumn: "1 / -1" }}>
            <label>Allergen notes</label>
            <input type="text" name="allergenNotes" defaultValue={row.allergenNotes ?? ""} />
          </div>

          <div className="sd-form-actions">
            <SaveButton />
            {!state.ok && <p className="sd-action-error" style={{ margin: 0 }}>{state.error}</p>}
          </div>
        </form>
      </td>
    </tr>
  );
}

export function ComplianceTable({ rows }: { rows: ComplianceWorklistRow[] }) {
  return (
    <div className="sd-table-wrap">
      <table className="sd-table">
        <thead>
          <tr>
            <th>Urgency</th>
            <th>Product</th>
            <th colSpan={5}>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ComplianceRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
