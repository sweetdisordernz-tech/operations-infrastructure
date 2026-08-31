"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { BigSubmitButton } from "@/app/_components/big-submit-button";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";

const CELEBRATE_MS = 750;

/**
 * A one-button form wired to a Server Action that returns ActionResult
 * instead of throwing. Renders the button (disabled while pending, via
 * BigSubmitButton's useFormStatus) and, if the action reports a clean
 * failure (e.g. someone else already completed this task), a small inline
 * message instead of crashing to Next's error page.
 *
 * On a successful completion, briefly shows a full-screen colour-fill +
 * checkmark celebration (see .sd-celebrate-overlay) - detected via
 * useActionState's isPending flipping true->false with state.ok true,
 * not by watching state.ok alone (INITIAL_ACTION_RESULT is itself
 * {ok:true}, so that alone can't distinguish "just succeeded" from
 * "never submitted yet").
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
  const [state, formAction, isPending] = useActionState(action, INITIAL_ACTION_RESULT);
  const [celebrating, setCelebrating] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    const justSucceeded = wasPending.current && !isPending && state.ok;
    wasPending.current = isPending;
    if (justSucceeded) {
      setCelebrating(true);
      const timer = setTimeout(() => setCelebrating(false), CELEBRATE_MS);
      return () => clearTimeout(timer);
    }
  }, [isPending, state.ok]);

  return (
    <form action={formAction}>
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <BigSubmitButton pendingLabel={pendingLabel}>{buttonLabel}</BigSubmitButton>
      {!state.ok && <p className="sd-action-error">{state.error}</p>}
      {celebrating && (
        <div className="sd-celebrate-overlay" aria-hidden="true">
          <CheckCircle2 strokeWidth={2.5} />
        </div>
      )}
    </form>
  );
}
