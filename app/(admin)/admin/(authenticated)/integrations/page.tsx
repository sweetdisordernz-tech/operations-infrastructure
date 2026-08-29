import { prisma } from "@/lib/db";
import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import type { IntegrationName, IntegrationSyncStatus } from "@prisma/client";

const STATUS_BADGE: Record<IntegrationSyncStatus, string> = {
  SUCCESS: "sd-badge-success",
  FAILURE: "sd-badge-danger",
  PARTIAL: "sd-badge-warning",
};

const INTEGRATIONS: IntegrationName[] = ["SHOPIFY", "XERO", "KLAVIYO", "BREVO"];
const STATUSES: IntegrationSyncStatus[] = ["SUCCESS", "FAILURE", "PARTIAL"];

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ integration?: string; status?: string }>;
}) {
  await requireAdminPageUser();
  const params = await searchParams;

  const integration = INTEGRATIONS.includes(params.integration as IntegrationName)
    ? (params.integration as IntegrationName)
    : undefined;
  const status = STATUSES.includes(params.status as IntegrationSyncStatus)
    ? (params.status as IntegrationSyncStatus)
    : undefined;

  const logs = await prisma.integrationSyncLog.findMany({
    where: { ...(integration ? { integration } : {}), ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const failureCount = logs.filter((l) => l.status === "FAILURE").length;

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Integration Health</h1>
          <p>Shopify, Xero, Klaviyo and Brevo sync activity - errors surfaced first.</p>
        </div>
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Sync log</h2>
          <div className="sd-stat-row">
            <div className="sd-stat">
              <span className="sd-stat-number">{failureCount}</span>
              <span className="sd-stat-label">Failures shown</span>
            </div>
            <div className="sd-stat">
              <span className="sd-stat-number">{logs.length}</span>
              <span className="sd-stat-label">Entries shown</span>
            </div>
          </div>
        </div>

        <form method="get" className="sd-toolbar" style={{ marginBottom: "1rem" }}>
          <select name="integration" defaultValue={integration ?? ""}>
            <option value="">All integrations</option>
            {INTEGRATIONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" className="sd-btn sd-btn-sm">
            Filter
          </button>
          {(integration || status) && (
            <a href="/integrations" className="sd-btn sd-btn-sm">
              Clear
            </a>
          )}
        </form>

        {logs.length === 0 ? (
          <p className="sd-empty-state">No sync activity logged{integration || status ? " for these filters" : " yet"}.</p>
        ) : (
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Integration</th>
                  <th>Direction</th>
                  <th>Status</th>
                  <th>Summary</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.createdAt.toLocaleString("en-NZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="sd-table-name">{log.integration}</td>
                    <td>{log.direction}</td>
                    <td>
                      <span className={`sd-badge ${STATUS_BADGE[log.status]}`}>{log.status}</span>
                    </td>
                    <td className="sd-table-sub">{log.payloadSummary ?? "-"}</td>
                    <td>
                      {log.errorMessage ? (
                        <span style={{ color: "var(--sd-error)" }}>{log.errorMessage}</span>
                      ) : (
                        "-"
                      )}
                    </td>
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
