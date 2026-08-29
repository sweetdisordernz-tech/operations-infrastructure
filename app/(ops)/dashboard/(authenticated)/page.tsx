import Link from "next/link";
import { ClipboardList, Package, Candy, Tag, Megaphone } from "lucide-react";
import { getOpsDashboardSummary } from "@/lib/ops/dashboard";

export default async function OpsHome() {
  const summary = await getOpsDashboardSummary();

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Owner Dashboard</h1>
          <p>What needs a look today - open a tile for the full picture.</p>
        </div>
      </div>

      <div className="sd-tile-grid">
        <Link href="/orders" className="sd-tile">
          <span className="sd-tile-icon">
            <ClipboardList aria-hidden="true" size={26} />
          </span>
          <span className="sd-tile-number">{summary.ordersAwaitingAction}</span>
          <span className="sd-tile-label">Orders awaiting action</span>
        </Link>

        <Link href="/inventory" className="sd-tile">
          <span className="sd-tile-icon">
            <Package aria-hidden="true" size={26} />
          </span>
          <span className="sd-tile-number">{summary.lowStockProductCount}</span>
          <span className="sd-tile-label">Products low on stock</span>
        </Link>

        <Link href="/filling" className="sd-tile">
          <span className="sd-tile-icon">
            <Candy aria-hidden="true" size={26} />
          </span>
          <span className="sd-tile-number">{summary.fillingsNeedingReorderCount}</span>
          <span className="sd-tile-label">Fillings need reordering</span>
        </Link>

        <Link href="/compliance" className="sd-tile">
          <span className="sd-tile-icon">
            <Tag aria-hidden="true" size={26} />
          </span>
          <span className="sd-tile-number">{summary.topPriorityComplianceCount}</span>
          <span className="sd-tile-label">Top-priority urgent labels</span>
        </Link>

        <Link href="/sales" className="sd-tile">
          <span className="sd-tile-icon">
            <Megaphone aria-hidden="true" size={26} />
          </span>
          <span className="sd-tile-number">{summary.leadsAwaitingFollowUpCount}</span>
          <span className="sd-tile-label">Leads awaiting follow-up</span>
        </Link>
      </div>
    </>
  );
}
