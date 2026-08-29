"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";
import { STAGE_ORDER, STAGE_LABELS, SEGMENT_ORDER, SEGMENT_LABELS, type LeadRow } from "@/lib/sales/pipeline";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="sd-btn sd-btn-primary" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function LeadForm({
  action,
  lead,
}: {
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  lead?: LeadRow;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, INITIAL_ACTION_RESULT);

  return (
    <form action={formAction} className="sd-crud-form">
      {lead && <input type="hidden" name="id" value={lead.id} />}
      <div className="sd-crud-grid">
        <div className="sd-field">
          <label htmlFor="companyName">Company name</label>
          <input id="companyName" type="text" name="companyName" defaultValue={lead?.companyName} required />
        </div>
        <div className="sd-field">
          <label htmlFor="contactName">Contact name</label>
          <input id="contactName" type="text" name="contactName" defaultValue={lead?.contactName ?? ""} />
        </div>
        <div className="sd-field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" name="email" defaultValue={lead?.email ?? ""} />
        </div>
        <div className="sd-field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" type="text" name="phone" defaultValue={lead?.phone ?? ""} />
        </div>
        <div className="sd-field">
          <label htmlFor="segment">Segment</label>
          <select id="segment" name="segment" defaultValue={lead?.segment ?? SEGMENT_ORDER[0]} required>
            {SEGMENT_ORDER.map((segment) => (
              <option key={segment} value={segment}>
                {SEGMENT_LABELS[segment]}
              </option>
            ))}
          </select>
        </div>
        <div className="sd-field">
          <label htmlFor="stage">Stage</label>
          <select id="stage" name="stage" defaultValue={lead?.stage ?? STAGE_ORDER[0]} required>
            {STAGE_ORDER.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
        </div>
        <div className="sd-field">
          <label htmlFor="source">Source</label>
          <input id="source" type="text" name="source" defaultValue={lead?.source ?? ""} placeholder="e.g. LinkedIn" />
        </div>
        <div className="sd-field">
          <label htmlFor="estOrderValueNzd">Est. order value (NZD)</label>
          <input id="estOrderValueNzd" type="number" name="estOrderValueNzd" min={0} step="1" defaultValue={lead?.estOrderValueNzd ?? ""} />
        </div>
        <div className="sd-field">
          <label htmlFor="nextActionDate">Next action date</label>
          <input id="nextActionDate" type="date" name="nextActionDate" defaultValue={toDateInputValue(lead?.nextActionDate ?? null)} />
        </div>
        <div className="sd-field">
          <label htmlFor="nextAction">Next action</label>
          <input id="nextAction" type="text" name="nextAction" defaultValue={lead?.nextAction ?? ""} placeholder="e.g. Send EDM 2" />
        </div>
        <div className="sd-field">
          <label htmlFor="lastTouchDate">Last touch date</label>
          <input id="lastTouchDate" type="date" name="lastTouchDate" defaultValue={toDateInputValue(lead?.lastTouchDate ?? null)} />
        </div>
      </div>
      <div className="sd-field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={4} defaultValue={lead?.notes ?? ""} />
      </div>
      <div className="sd-form-actions">
        <SubmitButton label={lead ? "Save changes" : "Add lead"} pendingLabel={lead ? "Saving..." : "Adding..."} />
        {!state.ok && <p className="sd-action-error" style={{ margin: 0 }}>{state.error}</p>}
      </div>
    </form>
  );
}
