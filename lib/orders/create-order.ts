import { prisma } from "@/lib/db";
import type {
  Order,
  OrderLineItem,
  OrderTask,
  OrderSource,
  Region,
  PaymentPhase,
  PaymentStatus,
} from "@prisma/client";

/**
 * Shared order-creation logic used by both the Shopify webhook (this stage)
 * and the wholesale portal (a later stage), so both surfaces create orders
 * - and decrement inventory - exactly the same way.
 */

export class OrderValidationError extends Error {
  details: Array<{ productId: string; sku: string | null; minOrderQty: number; requestedQty: number }>;

  constructor(
    details: Array<{ productId: string; sku: string | null; minOrderQty: number; requestedQty: number }>,
  ) {
    super(
      `Line item quantity below min_order_qty for: ${details
        .map((d) => `${d.sku ?? d.productId} (min ${d.minOrderQty}, got ${d.requestedQty})`)
        .join(", ")}`,
    );
    this.name = "OrderValidationError";
    this.details = details;
  }
}

export type CreateOrderLineItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type CreateOrderInput = {
  orderNumber: string;
  source: OrderSource;
  region: Region;
  wholesaleCustomerId?: string | null;
  shopifyOrderId?: string | null;
  paymentPhase: PaymentPhase;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  currency: string;
  placedAt: Date;
  lineItems: CreateOrderLineItemInput[];
  /**
   * Skip the min_order_qty check. Shopify orders are already-completed
   * retail sales (Shopify itself enforces any purchase minimums at
   * checkout) - min_order_qty is a wholesale case-pack concept, so the
   * Shopify webhook passes true here. The wholesale portal (a later stage)
   * should leave this false so the constraint is actually enforced.
   */
  skipMinOrderQtyValidation?: boolean;
};

export type CreatedOrder = Order & {
  lineItems: OrderLineItem[];
  tasks: OrderTask[];
};

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  if (input.lineItems.length === 0) {
    throw new Error("Cannot create an order with no line items");
  }

  const productIds = [...new Set(input.lineItems.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { filling: { include: { inventory: true } } },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const missingProductIds = productIds.filter((id) => !productById.has(id));
  if (missingProductIds.length > 0) {
    throw new Error(`Unknown product id(s): ${missingProductIds.join(", ")}`);
  }

  if (!input.skipMinOrderQtyValidation) {
    const violations = input.lineItems
      .filter((item) => item.quantity < productById.get(item.productId)!.minOrderQty)
      .map((item) => {
        const product = productById.get(item.productId)!;
        return {
          productId: product.id,
          sku: product.sku,
          minOrderQty: product.minOrderQty,
          requestedQty: item.quantity,
        };
      });
    if (violations.length > 0) {
      throw new OrderValidationError(violations);
    }
  }

  // Aggregate inventory decrements so each product/filling is updated once,
  // even if it appears in multiple line items.
  const productQtyDecrements = new Map<string, number>();
  const fillingUnitDecrements = new Map<string, number>();

  for (const item of input.lineItems) {
    productQtyDecrements.set(
      item.productId,
      (productQtyDecrements.get(item.productId) ?? 0) + item.quantity,
    );

    const product = productById.get(item.productId)!;
    if (product.fillingId) {
      const portionsPerPurchaseUnit = product.filling?.inventory?.portionsPerPurchaseUnit;
      const ratio = portionsPerPurchaseUnit ? Number(portionsPerPurchaseUnit) : 1;
      const purchaseUnitsUsed = item.quantity / ratio;
      fillingUnitDecrements.set(
        product.fillingId,
        (fillingUnitDecrements.get(product.fillingId) ?? 0) + purchaseUnitsUsed,
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber: input.orderNumber,
        source: input.source,
        region: input.region,
        wholesaleCustomerId: input.wholesaleCustomerId ?? null,
        shopifyOrderId: input.shopifyOrderId ?? null,
        paymentPhase: input.paymentPhase,
        paymentStatus: input.paymentStatus,
        totalAmount: input.totalAmount,
        currency: input.currency,
        placedAt: input.placedAt,
        lineItems: {
          create: input.lineItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
        tasks: {
          create: [
            { stage: "LABELLING", status: "PENDING" },
            { stage: "PACKING", status: "PENDING" },
            { stage: "DISPATCH", status: "PENDING" },
          ],
        },
      },
      include: { lineItems: true, tasks: true },
    });

    // One OrderTaskLineItem per line item, attached to the LABELLING task
    // only - this is what lets the floor app batch labelling by product
    // across every pending order while still knowing, per order, when all
    // of its line items are done. PACKING/DISPATCH stay per-order and never
    // get child rows.
    const labellingTask = order.tasks.find((task) => task.stage === "LABELLING")!;
    await tx.orderTaskLineItem.createMany({
      data: order.lineItems.map((lineItem) => ({
        orderTaskId: labellingTask.id,
        orderLineItemId: lineItem.id,
      })),
    });

    for (const [productId, qty] of productQtyDecrements) {
      await tx.inventoryItem.updateMany({
        where: { productId },
        data: { quantityOnHand: { decrement: qty } },
      });
    }

    for (const [fillingId, units] of fillingUnitDecrements) {
      await tx.fillingInventory.updateMany({
        where: { fillingId },
        data: { quantityOnHand: { decrement: units } },
      });
    }

    return order;
  });
}
