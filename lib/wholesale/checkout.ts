import { prisma } from "@/lib/db";
import { createOrder, type CreatedOrder } from "@/lib/orders/create-order";
import { generateOrderNumber } from "@/lib/order-number";
import { sendOrderConfirmationEmail } from "@/lib/email";
import type { Region, WholesaleCustomer } from "@prisma/client";

export class CheckoutError extends Error {}

export type CartItemInput = { productId: string; quantity: number; region: Region };

/**
 * Places a wholesale order from the portal cart. If the cart spans both
 * regions (only possible for a shipsToBothRegions customer), each region
 * becomes its own Order via the shared createOrder service - its own line
 * items, tasks, and inventory decrement - rather than one Order awkwardly
 * split after the fact. Prices are always re-resolved from
 * PricingTierProduct here, never trusted from the client.
 */
export async function placeWholesaleOrder(
  customer: WholesaleCustomer,
  items: CartItemInput[],
): Promise<{ orders: CreatedOrder[] }> {
  if (items.length === 0) {
    throw new CheckoutError("Your cart is empty.");
  }
  if (!customer.pricingTierId) {
    throw new CheckoutError(
      "Your account doesn't have wholesale pricing set up yet - contact Sweet Disorder to place an order.",
    );
  }

  // A customer not flagged for both regions can't split their cart no
  // matter what the client sends - every item goes to their account region.
  const normalizedItems = customer.shipsToBothRegions
    ? items
    : items.map((item) => ({ ...item, region: customer.region }));

  const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
  const priceRows = await prisma.pricingTierProduct.findMany({
    where: { pricingTierId: customer.pricingTierId, productId: { in: productIds } },
  });
  const priceByProductId = new Map(priceRows.map((row) => [row.productId, Number(row.price)]));

  const unpricedIds = productIds.filter((id) => !priceByProductId.has(id));
  if (unpricedIds.length > 0) {
    const unpriced = await prisma.product.findMany({
      where: { id: { in: unpricedIds } },
      select: { name: true },
    });
    const names = unpriced.map((p) => p.name).join(", ");
    throw new CheckoutError(
      `${names} ${unpriced.length === 1 ? "is" : "are"} no longer available - please remove ${unpriced.length === 1 ? "it" : "them"} from your cart and try again.`,
    );
  }

  const itemsByRegion = new Map<Region, CartItemInput[]>();
  for (const item of normalizedItems) {
    const list = itemsByRegion.get(item.region) ?? [];
    list.push(item);
    itemsByRegion.set(item.region, list);
  }

  const createdOrders: CreatedOrder[] = [];
  for (const [region, regionItems] of itemsByRegion) {
    const lineItems = regionItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: priceByProductId.get(item.productId)!,
    }));
    const totalAmount = lineItems.reduce((sum, li) => sum + li.unitPrice * li.quantity, 0);

    const order = await createOrder({
      orderNumber: generateOrderNumber(),
      source: "WHOLESALE_PORTAL",
      region,
      wholesaleCustomerId: customer.id,
      paymentPhase: "INVOICE",
      paymentStatus: "AWAITING_INVOICE",
      totalAmount,
      currency: region === "AU" ? "AUD" : "NZD",
      placedAt: new Date(),
      lineItems,
    });
    createdOrders.push(order);
  }

  await sendOrderConfirmationEmail(
    customer.email,
    customer.contactName,
    createdOrders.map((order) => ({
      orderNumber: order.orderNumber,
      region: order.region,
      currency: order.currency,
      totalAmount: Number(order.totalAmount),
    })),
  );

  return { orders: createdOrders };
}
