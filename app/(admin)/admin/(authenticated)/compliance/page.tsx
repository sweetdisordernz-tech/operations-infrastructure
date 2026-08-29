import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { getComplianceWorklist } from "@/lib/admin/label-compliance";
import { ComplianceTable } from "@/app/_components/admin/compliance-table";

export default async function CompliancePage() {
  await requireAdminPageUser();
  const rows = await getComplianceWorklist();
  const topPriorityCount = rows.filter((r) => r.urgency === "TOP_PRIORITY_URGENT").length;

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Label Compliance</h1>
          <p>Allergen, address, country-of-origin, and nutrition status per SKU, sorted by urgency.</p>
        </div>
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Worklist</h2>
          <div className="sd-stat-row">
            <div className="sd-stat">
              <span className="sd-stat-number">{topPriorityCount}</span>
              <span className="sd-stat-label">Top priority urgent</span>
            </div>
            <div className="sd-stat">
              <span className="sd-stat-number">{rows.length}</span>
              <span className="sd-stat-label">Records</span>
            </div>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="sd-empty-state">No label compliance records yet.</p>
        ) : (
          <ComplianceTable rows={rows} />
        )}
      </div>
    </>
  );
}
