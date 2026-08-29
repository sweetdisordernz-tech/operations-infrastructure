"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FileText, Download } from "lucide-react";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";
import { uploadOnePagerAction } from "@/app/(ops)/dashboard/(authenticated)/sales/actions";

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="sd-btn sd-btn-primary sd-btn-sm" disabled={pending}>
      {pending ? "Uploading..." : "Upload"}
    </button>
  );
}

export function OnePagerCard({ url }: { url: string | null }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(uploadOnePagerAction, INITIAL_ACTION_RESULT);

  return (
    <div className="sd-panel">
      <div className="sd-panel-header">
        <h2 className="sd-section-heading">Corporate one-pager</h2>
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="sd-btn sd-btn-primary">
          <Download size={16} aria-hidden="true" /> Download one-pager
        </a>
      ) : (
        <p className="sd-caption" style={{ marginBottom: "0.75rem" }}>
          <FileText size={14} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: "0.3rem" }} />
          Not uploaded yet - attach the business&apos;s existing one-pager PDF below and it&apos;ll show as a
          download link here.
        </p>
      )}
      <form action={formAction} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.75rem" }}>
        <input type="file" name="file" accept="application/pdf" required />
        <UploadButton />
      </form>
      {!state.ok && <p className="sd-action-error">{state.error}</p>}
    </div>
  );
}
