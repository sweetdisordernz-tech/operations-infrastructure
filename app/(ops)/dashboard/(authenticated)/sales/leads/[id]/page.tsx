import { notFound } from "next/navigation";
import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { getLead } from "@/lib/sales/pipeline";
import { LeadForm } from "@/app/_components/sales/lead-form";
import { DeleteButton } from "@/app/_components/admin/delete-button";
import { updateLeadAction, deleteLeadAction } from "@/app/(ops)/dashboard/(authenticated)/sales/actions";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPageUser();
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">{lead.companyName}</h1>
          <p>Lead #{lead.leadNumber} · Owner: {lead.ownerName}</p>
        </div>
      </div>

      <div className="sd-panel">
        <LeadForm action={updateLeadAction} lead={lead} />
      </div>

      <div className="sd-panel">
        <h2 className="sd-section-heading" style={{ marginBottom: "0.75rem" }}>
          Danger zone
        </h2>
        <DeleteButton
          action={deleteLeadAction}
          hiddenFields={{ id: lead.id }}
          label="Delete lead"
          confirmMessage={`Delete "${lead.companyName}"? This can't be undone.`}
        />
      </div>
    </>
  );
}
