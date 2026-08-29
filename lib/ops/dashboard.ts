import { prisma } from "@/lib/db";
import { getProductsNeedingReorder, getFillingsNeedingReorder } from "@/lib/inventory/reorder";

/**
 * At-a-glance numbers for the five overview tiles on Molly's Ops Dashboard
 * home (brief Section 10.1) - kept deliberately simple/summary-only, same
 * pattern as Master Connect's home tiles.
 */
export type OpsDashboardSummary = {
  ordersAwaitingAction: number;
  lowStockProductCount: number;
  fillingsNeedingReorderCount: number;
  topPriorityComplianceCount: number;
  leadsAwaitingFollowUpCount: number;
};

export async function getOpsDashboardSummary(): Promise<OpsDashboardSummary> {
  const [ordersAwaitingAction, productReorders, fillingReorders, topPriorityComplianceCount, leadsAwaitingFollowUpCount] =
    await Promise.all([
      prisma.order.count({ where: { status: { not: "DISPATCHED" } } }),
      getProductsNeedingReorder(),
      getFillingsNeedingReorder(),
      prisma.labelComplianceRecord.count({ where: { urgency: "TOP_PRIORITY_URGENT" } }),
      prisma.salesLead.count({ where: { stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } } }),
    ]);

  return {
    ordersAwaitingAction,
    lowStockProductCount: productReorders.length,
    fillingsNeedingReorderCount: fillingReorders.length,
    topPriorityComplianceCount,
    leadsAwaitingFollowUpCount,
  };
}
