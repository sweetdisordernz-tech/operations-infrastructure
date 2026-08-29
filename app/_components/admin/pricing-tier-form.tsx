"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="sd-btn sd-btn-primary" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function PricingTierForm({
  action,
  tier,
}: {
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  tier?: { id: string; name: string; region: "NZ" | "AU" };
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, INITIAL_ACTION_RESULT);

  return (
    <form action={formAction} className="sd-crud-form">
      {tier && <input type="hidden" name="id" value={tier.id} />}
      <div className="sd-crud-grid">
        <div className="sd-field">
          <label htmlFor="name">Name</label>
          <input id="name" type="text" name="name" defaultValue={tier?.name} required />
        </div>
        <div className="sd-field">
          <label htmlFor="region">Region</label>
          <select id="region" name="region" defaultValue={tier?.region ?? "NZ"}>
            <option value="NZ">NZ</option>
            <option value="AU">AU</option>
          </select>
        </div>
      </div>
      <div className="sd-form-actions">
        <SubmitButton label={tier ? "Save changes" : "Add pricing tier"} pendingLabel={tier ? "Saving..." : "Adding..."} />
        {!state.ok && <p className="sd-action-error" style={{ margin: 0 }}>{state.error}</p>}
      </div>
    </form>
  );
}
