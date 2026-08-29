import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { LeadForm } from "@/app/_components/sales/lead-form";
import { createLeadAction } from "@/app/(ops)/dashboard/(authenticated)/sales/actions";

export default async function NewLeadPage() {
  await requireAdminPageUser();

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Add Lead</h1>
        </div>
      </div>
      <div className="sd-panel">
        <LeadForm action={createLeadAction} />
      </div>
    </>
  );
}
