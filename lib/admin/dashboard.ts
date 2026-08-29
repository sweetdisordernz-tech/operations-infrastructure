import { prisma } from "@/lib/db";

/**
 * At-a-glance numbers for Master Connect's six home tiles (brief Section 9 /
 * 15.1). Each tile links to the fuller page that explains its number - this
 * is intentionally cheap/summary-only, matching the "home screen stays
 * simple" pattern used throughout the brief.
 */

export type IntegrationTileStatus = {
  lastStatus: "SUCCESS" | "FAILURE" | "PARTIAL" | null;
  lastSyncAt: Date | null;
};

export type MasterConnectSummary = {
  shopifyOrdersAwaitingAction: number;
  wholesaleOrdersAwaitingAction: number;
  leadsAwaitingFollowUp: number;
  klaviyo: IntegrationTileStatus;
  xero: IntegrationTileStatus;
  activeProductCount: number;
};

async function latestIntegrationStatus(integration: "KLAVIYO" | "XERO"): Promise<IntegrationTileStatus> {
  const latest = await prisma.integrationSyncLog.findFirst({
    where: { integration },
    orderBy: { createdAt: "desc" },
  });
  return { lastStatus: latest?.status ?? null, lastSyncAt: latest?.createdAt ?? null };
}

export async function getMasterConnectSummary(): Promise<MasterConnectSummary> {
  const [
    shopifyOrdersAwaitingAction,
    wholesaleOrdersAwaitingAction,
    leadsAwaitingFollowUp,
    klaviyo,
    xero,
    activeProductCount,
  ] = await Promise.all([
    prisma.order.count({ where: { source: "SHOPIFY", status: { not: "DISPATCHED" } } }),
    prisma.order.count({ where: { source: "WHOLESALE_PORTAL", status: { not: "DISPATCHED" } } }),
    prisma.salesLead.count({ where: { stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } } }),
    latestIntegrationStatus("KLAVIYO"),
    latestIntegrationStatus("XERO"),
    prisma.product.count({ where: { active: true } }),
  ]);

  return {
    shopifyOrdersAwaitingAction,
    wholesaleOrdersAwaitingAction,
    leadsAwaitingFollowUp,
    klaviyo,
    xero,
    activeProductCount,
  };
}
