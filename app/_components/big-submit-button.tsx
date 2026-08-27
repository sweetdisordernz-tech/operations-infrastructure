"use client";

import { useFormStatus } from "react-dom";

export function BigSubmitButton({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="sd-big-button" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
