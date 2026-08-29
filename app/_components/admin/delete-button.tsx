"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";

function ConfirmSubmit({ label, confirmMessage }: { label: string; confirmMessage: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="sd-btn sd-btn-danger"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {pending ? "Deleting..." : label}
    </button>
  );
}

export function DeleteButton({
  action,
  hiddenFields,
  label,
  confirmMessage,
}: {
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  hiddenFields: Record<string, string>;
  label: string;
  confirmMessage: string;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, INITIAL_ACTION_RESULT);

  return (
    <form action={formAction}>
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <ConfirmSubmit label={label} confirmMessage={confirmMessage} />
      {!state.ok && <p className="sd-action-error">{state.error}</p>}
    </form>
  );
}
