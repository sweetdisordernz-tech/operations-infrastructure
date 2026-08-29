"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";

type PricingTierOption = { id: string; name: string; region: "NZ" | "AU" };

type CustomerValues = {
  id?: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  region: "NZ" | "AU";
  shipsToBothRegions: boolean;
  pricingTierId: string | null;
};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="sd-btn sd-btn-primary" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function CustomerForm({
  action,
  pricingTiers,
  customer,
}: {
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  pricingTiers: PricingTierOption[];
  customer?: CustomerValues;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, INITIAL_ACTION_RESULT);

  return (
    <form action={formAction} className="sd-crud-form">
      {customer?.id && <input type="hidden" name="id" value={customer.id} />}
      <div className="sd-crud-grid">
        <div className="sd-field">
          <label htmlFor="companyName">Company name</label>
          <input id="companyName" type="text" name="companyName" defaultValue={customer?.companyName} required />
        </div>
        <div className="sd-field">
          <label htmlFor="contactName">Contact name</label>
          <input id="contactName" type="text" name="contactName" defaultValue={customer?.contactName} required />
        </div>
        <div className="sd-field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" name="email" defaultValue={customer?.email} required />
        </div>
        <div className="sd-field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" type="text" name="phone" defaultValue={customer?.phone ?? ""} />
        </div>
        <div className="sd-field">
          <label htmlFor="region">Region</label>
          <select id="region" name="region" defaultValue={customer?.region ?? "NZ"}>
            <option value="NZ">NZ</option>
            <option value="AU">AU</option>
          </select>
        </div>
        <div className="sd-field">
          <label htmlFor="pricingTierId">Pricing tier</label>
          <select id="pricingTierId" name="pricingTierId" defaultValue={customer?.pricingTierId ?? ""}>
            <option value="">No pricing tier yet</option>
            {pricingTiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name} ({tier.region})
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="sd-checkbox-field">
        <input type="checkbox" name="shipsToBothRegions" defaultChecked={customer?.shipsToBothRegions ?? false} />
        Can split a single order across NZ and AU destinations
      </label>
      <div className="sd-form-actions">
        <SubmitButton label={customer ? "Save changes" : "Add customer"} pendingLabel={customer ? "Saving..." : "Adding..."} />
        {!state.ok && <p className="sd-action-error" style={{ margin: 0 }}>{state.error}</p>}
      </div>
    </form>
  );
}
