import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { getComplianceWorklist } from "@/lib/admin/label-compliance";

const URGENCY_BADGE: Record<string, string> = {
  TOP_PRIORITY_URGENT: "sd-badge-danger",
  URGENT_CHANGE_NEEDED: "sd-badge-warning",
  CHANGE_NEEDED_NOT_URGENT: "sd-badge-info",
  NO_CHANGE_NEEDED: "sd-badge-success",
};

const URGENCY_LABEL: Record<string, string> = {
  TOP_PRIORITY_URGENT: "Top priority urgent",
  URGENT_CHANGE_NEEDED: "Urgent change needed",
  CHANGE_NEEDED_NOT_URGENT: "Change needed, not urgent",
  NO_CHANGE_NEEDED: "No change needed",
};

export default async function OpsCompliancePage() {
  await requireAdminPageUser();
  const rows = await getComplianceWorklist();
  const topPriorityCount = rows.filter((r) => r.urgency === "TOP_PRIORITY_URGENT").length;

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Label Compliance</h1>
          <p>What needs fixing first, sorted by urgency. Edit details in Master Connect.</p>
        </div>
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Worklist</h2>
          <div className="sd-stat">
            <span className="sd-stat-number">{topPriorityCount}</span>
            <span className="sd-stat-label">Top priority urgent</span>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="sd-empty-state">No label compliance records yet.</p>
        ) : (
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Urgency</th>
                  <th>Product</th>
                  <th>Labels in stock</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className={`sd-badge ${URGENCY_BADGE[row.urgency]}`}>{URGENCY_LABEL[row.urgency]}</span>
                    </td>
                    <td>
                      <div className="sd-table-name">{row.productName}</div>
                      <div className="sd-table-sub">{row.sku ?? "No SKU yet"}</div>
                    </td>
                    <td>{row.labelsInStock ?? "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
