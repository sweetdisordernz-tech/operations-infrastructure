import { prisma } from "@/lib/db";
import type { PackagingType } from "@prisma/client";
import type { WholesaleCatalog } from "@/lib/wholesale/catalog";

/**
 * "Reorder your usuals": for each product this customer has ordered
 * (through the portal) at least twice before, the average quantity per
 * order and average number of days between orders - a nudge ("here's
 * roughly what and when you usually order"), not a forecasting model.
 * Only surfaces products still actually orderable (in the current priced
 * catalog); a product with just one past order doesn't have an established
 * pattern yet, so it's left out rather than guessing.
 */

export type ReorderSuggestion = {
  productId: string;
  productName: string;
  packagingType: PackagingType;
  fillingName: string | null;
  price: number;
  avgQuantity: number;
  avgIntervalDays: number;
  lastOrderedAt: Date;
  daysSinceLastOrder: number;
  dueNow: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getReorderSuggestions(
  customerId: string,
  catalog: WholesaleCatalog,
  limit = 5,
): Promise<ReorderSuggestion[]> {
  const orders = await prisma.order.findMany({
    where: { wholesaleCustomerId: customerId, source: "WHOLESALE_PORTAL" },
    orderBy: { placedAt: "asc" },
    select: { placedAt: true, lineItems: { select: { productId: true, quantity: true } } },
  });

  if (orders.length === 0) return [];

  const catalogByProductId = new Map(catalog.products.map((p) => [p.productId, p]));

  type Accumulator = { totalQuantity: number; occurrences: number; orderDates: Date[] };
  const byProduct = new Map<string, Accumulator>();

  for (const order of orders) {
    const seenInThisOrder = new Set<string>();
    for (const lineItem of order.lineItems) {
      let acc = byProduct.get(lineItem.productId);
      if (!acc) {
        acc = { totalQuantity: 0, occurrences: 0, orderDates: [] };
        byProduct.set(lineItem.productId, acc);
      }
      acc.totalQuantity += lineItem.quantity;
      acc.occurrences += 1;
      if (!seenInThisOrder.has(lineItem.productId)) {
        acc.orderDates.push(order.placedAt);
        seenInThisOrder.add(lineItem.productId);
      }
    }
  }

  const now = Date.now();
  const suggestions: ReorderSuggestion[] = [];

  for (const [productId, acc] of byProduct) {
    if (acc.orderDates.length < 2) continue; // no established pattern yet
    const catalogProduct = catalogByProductId.get(productId);
    if (!catalogProduct) continue; // no longer orderable

    const gaps: number[] = [];
    for (let i = 1; i < acc.orderDates.length; i++) {
      gaps.push((acc.orderDates[i].getTime() - acc.orderDates[i - 1].getTime()) / DAY_MS);
    }
    const avgIntervalDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const lastOrderedAt = acc.orderDates[acc.orderDates.length - 1];
    const daysSinceLastOrder = (now - lastOrderedAt.getTime()) / DAY_MS;

    suggestions.push({
      productId,
      productName: catalogProduct.name,
      packagingType: catalogProduct.packagingType,
      fillingName: catalogProduct.fillingName,
      price: catalogProduct.price,
      avgQuantity: Math.max(1, Math.round(acc.totalQuantity / acc.occurrences)),
      avgIntervalDays: Math.round(avgIntervalDays),
      lastOrderedAt,
      daysSinceLastOrder: Math.round(daysSinceLastOrder),
      dueNow: daysSinceLastOrder >= avgIntervalDays,
    });
  }

  suggestions.sort(
    (a, b) => b.daysSinceLastOrder - b.avgIntervalDays - (a.daysSinceLastOrder - a.avgIntervalDays),
  );

  return suggestions.slice(0, limit);
}
