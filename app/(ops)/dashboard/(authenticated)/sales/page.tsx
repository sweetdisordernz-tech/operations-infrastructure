import Link from "next/link";
import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { getLeads, computePipelineMetrics, STAGE_LABELS, SEGMENT_LABELS } from "@/lib/sales/pipeline";
import { getEmailTemplates } from "@/lib/sales/templates";
import { getGiftingOccasions } from "@/lib/sales/occasions";
import { getOnePagerUrl } from "@/lib/sales/one-pager";
import { TabSwitcher } from "@/app/_components/tab-switcher";
import { PipelineBoard } from "@/app/_components/sales/pipeline-board";
import { TemplatesLibrary } from "@/app/_components/sales/templates-library";
import { OccasionsList } from "@/app/_components/sales/occasions-list";
import { OnePagerCard } from "@/app/_components/sales/one-pager-card";

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
}

export default async function SalesDashboardPage() {
  await requireAdminPageUser();

  const [leads, templates, occasions, onePagerUrl] = await Promise.all([
    getLeads(),
    getEmailTemplates(),
    getGiftingOccasions(),
    getOnePagerUrl(),
  ]);
  const metrics = computePipelineMetrics(leads);

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Sales & Marketing</h1>
          <p>The corporate-gifting pipeline, outreach copy, and seasonal calendar.</p>
        </div>
        <Link href="/sales/leads/new" className="sd-btn sd-btn-primary">
          Add lead
        </Link>
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Pipeline summary</h2>
        </div>
        <div className="sd-stat-row" style={{ marginBottom: "1.25rem" }}>
          <div className="sd-stat">
            <span className="sd-stat-number">{metrics.totalLeads}</span>
            <span className="sd-stat-label">Total leads</span>
          </div>
          <div className="sd-stat">
            <span className="sd-stat-number">{formatCurrency(metrics.totalPipelineValue)}</span>
            <span className="sd-stat-label">Pipeline value</span>
          </div>
          <div className="sd-stat">
            <span className="sd-stat-number">{formatCurrency(metrics.closedWonValue)}</span>
            <span className="sd-stat-label">Closed-won value</span>
          </div>
          <div className="sd-stat">
            <span className="sd-stat-number">{metrics.winRate === null ? "-" : `${Math.round(metrics.winRate * 100)}%`}</span>
            <span className="sd-stat-label">Win rate</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          <div>
            <p className="sd-caption" style={{ marginBottom: "0.4rem" }}>
              By stage
            </p>
            {metrics.stageBreakdown.map((row) => (
              <p key={row.stage} className="sd-caption" style={{ margin: 0 }}>
                {STAGE_LABELS[row.stage]}: {row.count}
              </p>
            ))}
          </div>
          <div>
            <p className="sd-caption" style={{ marginBottom: "0.4rem" }}>
              By segment
            </p>
            {metrics.segmentBreakdown.map((row) => (
              <p key={row.segment} className="sd-caption" style={{ margin: 0 }}>
                {SEGMENT_LABELS[row.segment]}: {row.count}
              </p>
            ))}
          </div>
        </div>
      </div>

      <TabSwitcher
        tabs={[
          {
            id: "pipeline",
            label: "Pipeline",
            content: (
              <div className="sd-panel">
                <PipelineBoard leads={leads} />
              </div>
            ),
          },
          {
            id: "templates",
            label: "Templates",
            content: (
              <div className="sd-panel">
                <TemplatesLibrary templates={templates} />
              </div>
            ),
          },
          {
            id: "occasions",
            label: "Occasions",
            content: (
              <div className="sd-panel">
                <OccasionsList seasonal={occasions.seasonal} alwaysOn={occasions.alwaysOn} />
              </div>
            ),
          },
        ]}
      />

      <OnePagerCard url={onePagerUrl} />
    </>
  );
}
