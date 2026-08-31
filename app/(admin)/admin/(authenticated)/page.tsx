import Link from "next/link";
import { ShoppingBag, TrendingUp, Mail, Database, Receipt } from "lucide-react";
import { getMasterConnectSummary } from "@/lib/admin/dashboard";

function formatSyncStatus(status: "SUCCESS" | "FAILURE" | "PARTIAL" | null, lastSyncAt: Date | null): string {
  if (!status) return "No syncs logged yet";
  const label = status === "SUCCESS" ? "Last sync OK" : status === "FAILURE" ? "Last sync failed" : "Last sync partial";
  if (!lastSyncAt) return label;
  return `${label} - ${lastSyncAt.toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}`;
}

export default async function AdminHome() {
  const summary = await getMasterConnectSummary();

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Master Connect</h1>
          <p>Everything Sweet Disorder Ops touches, in one place.</p>
        </div>
      </div>

      <div className="sd-hero-stat-row">
        <Link href="/orders" className="sd-hero-stat">
          <span className="sd-hero-stat-icon">
            <ShoppingBag aria-hidden="true" size={34} />
          </span>
          <span className="sd-hero-stat-number">
            {summary.shopifyOrdersAwaitingAction + summary.wholesaleOrdersAwaitingAction}
          </span>
          <span className="sd-hero-stat-label">Orders awaiting action</span>
        </Link>
        <div className="sd-hero-stat-breakdown">
          <Link href="/orders?source=SHOPIFY" className="sd-hero-stat-chip">
            <span className="sd-hero-stat-chip-number">{summary.shopifyOrdersAwaitingAction}</span>
            <span className="sd-hero-stat-chip-label">Shopify</span>
          </Link>
          <Link href="/orders?source=WHOLESALE_PORTAL" className="sd-hero-stat-chip">
            <span className="sd-hero-stat-chip-number">{summary.wholesaleOrdersAwaitingAction}</span>
            <span className="sd-hero-stat-chip-label">Wholesale</span>
          </Link>
        </div>
      </div>

      <div className="sd-tile-grid">
        <a href={`/?surface=ops`} className="sd-tile">
          <span className="sd-tile-icon">
            <TrendingUp aria-hidden="true" size={26} />
          </span>
          <span className="sd-tile-number">{summary.leadsAwaitingFollowUp}</span>
          <span className="sd-tile-label">Leads awaiting follow-up</span>
        </a>

        <div className="sd-tile">
          <span className="sd-tile-icon">
            <Mail aria-hidden="true" size={26} />
          </span>
          <span className="sd-card-title">Klaviyo</span>
          <span className="sd-tile-meta">{formatSyncStatus(summary.klaviyo.lastStatus, summary.klaviyo.lastSyncAt)}</span>
          <Link href="/integrations?integration=KLAVIYO" className="sd-tile-external">
            View sync log
          </Link>
          <a href="https://www.klaviyo.com/login" target="_blank" rel="noopener noreferrer" className="sd-tile-external">
            Open Klaviyo
          </a>
        </div>

        <Link href="/systems" className="sd-tile">
          <span className="sd-tile-icon">
            <Database aria-hidden="true" size={26} />
          </span>
          <span className="sd-tile-number">{summary.activeProductCount}</span>
          <span className="sd-tile-label">Active products - systems & records</span>
        </Link>

        <div className="sd-tile">
          <span className="sd-tile-icon">
            <Receipt aria-hidden="true" size={26} />
          </span>
          <span className="sd-card-title">Xero</span>
          <span className="sd-tile-meta">{formatSyncStatus(summary.xero.lastStatus, summary.xero.lastSyncAt)}</span>
          <Link href="/integrations?integration=XERO" className="sd-tile-external">
            View sync log
          </Link>
          <a href="https://login.xero.com/" target="_blank" rel="noopener noreferrer" className="sd-tile-external">
            Open Xero
          </a>
        </div>
      </div>
    </>
  );
}
