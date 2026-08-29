import { prisma } from "@/lib/db";

/**
 * The filling rollup view (brief Section 5.1/9): total units needed per
 * filling across every product that shares it, plus FillingInventory stock
 * on hand versus what's currently queued in open (not-yet-dispatched)
 * orders. This is the actual payoff of modelling Filling as a linked
 * entity instead of a free-text field on Product.
 */

export type FillingRollupRow = {
  fillingId: string;
  name: string;
  skuCount: number;
  unitsQueued: number;
  quantityOnHand: number | null;
  reorderThreshold: number | null;
  portionsPerPurchaseUnit: number | null;
};

export async function getFillingRollup(): Promise<FillingRollupRow[]> {
  const [fillings, openLineItems] = await Promise.all([
    prisma.filling.findMany({
      include: { inventory: true, products: { select: { id: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.orderLineItem.findMany({
      where: { order: { status: { not: "DISPATCHED" } }, product: { fillingId: { not: null } } },
      select: { quantity: true, product: { select: { fillingId: true } } },
    }),
  ]);

  const queuedByFilling = new Map<string, number>();
  for (const lineItem of openLineItems) {
    const fillingId = lineItem.product.fillingId;
    if (!fillingId) continue;
    queuedByFilling.set(fillingId, (queuedByFilling.get(fillingId) ?? 0) + lineItem.quantity);
  }

  return fillings.map((filling) => ({
    fillingId: filling.id,
    name: filling.name,
    skuCount: filling.products.length,
    unitsQueued: queuedByFilling.get(filling.id) ?? 0,
    quantityOnHand: filling.inventory ? filling.inventory.quantityOnHand.toNumber() : null,
    reorderThreshold: filling.inventory?.reorderThreshold ? filling.inventory.reorderThreshold.toNumber() : null,
    portionsPerPurchaseUnit: filling.inventory?.portionsPerPurchaseUnit
      ? filling.inventory.portionsPerPurchaseUnit.toNumber()
      : null,
  }));
}
