"use client";

import { useActionState } from "react";
import { BigSubmitButton } from "@/app/_components/big-submit-button";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";

/**
 * A one-button form wired to a Server Action that returns ActionResult
 * instead of throwing. Renders the button (disabled while pending, via
 * BigSubmitButton's useFormStatus) and, if the action reports a clean
 * failure (e.g. someone else already completed this task), a small inline
 * message instead of crashing to Next's error page.
 */
export function TaskActionForm({
  action,
  hiddenFields,
  buttonLabel,
  pendingLabel,
}: {
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  hiddenFields: Record<string, string>;
  buttonLabel: string;
  pendingLabel: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_RESULT);

  return (
    <form action={formAction}>
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <BigSubmitButton pendingLabel={pendingLabel}>{buttonLabel}</BigSubmitButton>
      {!state.ok && <p className="sd-action-error">{state.error}</p>}
    </form>
  );
}
