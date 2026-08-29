"use client";

import { useActionState, useRef } from "react";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";
import { toggleProductFlagAction } from "@/app/(admin)/admin/(authenticated)/products/actions";

export function ProductToggle({
  productId,
  field,
  checked,
  label,
}: {
  productId: string;
  field: "wholesaleVisible" | "active";
  checked: boolean;
  label: string;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(toggleProductFlagAction, INITIAL_ACTION_RESULT);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={formAction} ref={formRef}>
      <input type="hidden" name="id" value={productId} />
      <input type="hidden" name="field" value={field} />
      <label className="sd-checkbox-field" style={{ fontSize: "0.8rem" }}>
        <input
          type="checkbox"
          name="_checkbox"
          defaultChecked={checked}
          onChange={(e) => {
            const hidden = e.currentTarget.form?.elements.namedItem("value") as HTMLInputElement | null;
            if (hidden) hidden.value = String(e.currentTarget.checked);
            formRef.current?.requestSubmit();
          }}
        />
        <input type="hidden" name="value" defaultValue={String(checked)} />
        {label}
      </label>
      {!state.ok && <p className="sd-action-error" style={{ margin: 0, fontSize: "0.75rem" }}>{state.error}</p>}
    </form>
  );
}
