import { prisma } from "@/lib/db";
import { AdminValidationError } from "@/lib/admin/errors";

/**
 * Live finished-good stock levels per product (Master Connect's "Master
 * inventory record", brief Section 9), plus manual adjustment with an audit
 * trail. Reorder flagging itself stays in lib/inventory/reorder.ts (stage 2)
 * - not reimplemented here, just read alongside this list in the page.
 */

export type InventoryOverviewRow = {
  inventoryItemId: string;
  productId: string;
  sku: string | null;
  name: string;
  rangeName: string;
  quantityOnHand: number;
  reorderThreshold: number | null;
  recommendedReorderQty: number | null;
  supplierName: string | null;
  lastCountedAt: Date | null;
};

export async function getInventoryOverview(): Promise<InventoryOverviewRow[]> {
  const items = await prisma.inventoryItem.findMany({
    include: { product: { include: { range: true } }, supplier: true },
    orderBy: { product: { name: "asc" } },
  });

  return items.map((item) => ({
    inventoryItemId: item.id,
    productId: item.productId,
    sku: item.product.sku,
    name: item.product.name,
    rangeName: item.product.range.name,
    quantityOnHand: item.quantityOnHand,
    reorderThreshold: item.reorderThreshold,
    recommendedReorderQty: item.recommendedReorderQty,
    supplierName: item.supplier?.name ?? null,
    lastCountedAt: item.lastCountedAt,
  }));
}

/**
 * Manually corrects an InventoryItem's on-hand quantity and writes a
 * StockAdjustmentLog row in the same transaction - who, when, old value, new
 * value. Order-driven decrements (lib/orders/create-order.ts) don't go
 * through here; this is only for staff-initiated corrections.
 */
export async function adjustInventoryQuantity(
  inventoryItemId: string,
  newQuantity: number,
  changedByUserId: string,
  reason: string | null,
): Promise<void> {
  if (!Number.isInteger(newQuantity) || newQuantity < 0) {
    throw new AdminValidationError("Quantity must be a whole number of 0 or more.");
  }

  const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
  if (!item) {
    throw new AdminValidationError("That inventory item no longer exists.");
  }
  if (item.quantityOnHand === newQuantity) return;

  await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { quantityOnHand: newQuantity, lastCountedAt: new Date() },
    }),
    prisma.stockAdjustmentLog.create({
      data: {
        inventoryItemId,
        changedByUserId,
        previousQuantity: item.quantityOnHand,
        newQuantity,
        reason,
      },
    }),
  ]);
}
