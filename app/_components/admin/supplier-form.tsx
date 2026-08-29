"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";

type SupplierValues = {
  id?: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  leadTimeDays: number | null;
  notes: string | null;
};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="sd-btn sd-btn-primary" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function SupplierForm({
  action,
  supplier,
}: {
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  supplier?: SupplierValues;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, INITIAL_ACTION_RESULT);

  return (
    <form action={formAction} className="sd-crud-form">
      {supplier?.id && <input type="hidden" name="id" value={supplier.id} />}
      <div className="sd-crud-grid">
        <div className="sd-field">
          <label htmlFor="name">Name</label>
          <input id="name" type="text" name="name" defaultValue={supplier?.name} required />
        </div>
        <div className="sd-field">
          <label htmlFor="contactEmail">Contact email</label>
          <input id="contactEmail" type="email" name="contactEmail" defaultValue={supplier?.contactEmail ?? ""} />
        </div>
        <div className="sd-field">
          <label htmlFor="contactPhone">Contact phone</label>
          <input id="contactPhone" type="text" name="contactPhone" defaultValue={supplier?.contactPhone ?? ""} />
        </div>
        <div className="sd-field">
          <label htmlFor="leadTimeDays">Lead time (days)</label>
          <input id="leadTimeDays" type="number" name="leadTimeDays" min={0} defaultValue={supplier?.leadTimeDays ?? ""} />
        </div>
        <div className="sd-field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="notes">Notes</label>
          <input id="notes" type="text" name="notes" defaultValue={supplier?.notes ?? ""} />
        </div>
      </div>
      <div className="sd-form-actions">
        <SubmitButton label={supplier ? "Save changes" : "Add supplier"} pendingLabel={supplier ? "Saving..." : "Adding..."} />
        {!state.ok && <p className="sd-action-error" style={{ margin: 0 }}>{state.error}</p>}
      </div>
    </form>
  );
}
