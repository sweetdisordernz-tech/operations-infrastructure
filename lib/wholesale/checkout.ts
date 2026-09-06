import { prisma } from "@/lib/db";
import { createOrder, type CreatedOrder } from "@/lib/orders/create-order";
import { generateOrderNumber } from "@/lib/order-number";
import { sendOrderConfirmationEmail } from "@/lib/email";
import type { PricingTier, Region, WholesaleCustomer } from "@prisma/client";

export class CheckoutError extends Error {}

export type CartItemInput = { productId: string; quantity: number; region: Region };

/**
 * Resolves which PricingTier prices a region's line items with. A
 * customer's own assigned tier (customer.pricingTierId) is used for their
 * home region - unchanged from before, so a special/negotiated tier stays
 * respected there. For the *other* region (only reachable at all when
 * shipsToBothRegions is true, via the cart's per-line region toggle), the
 * customer has no assigned tier, so this falls back to that region's own
 * standard tier (Molly currently maintains exactly one NZ and one AU price
 * list - see the "one storefront, two price-list documents" framing in the
 * request this was built from).
 *
 * This matters because prior to this function existing, every line item in
 * a split cart was priced from customer.pricingTierId regardless of which
 * region it actually shipped to - silently harmless while every tier
 * carried the same placeholder prices, but wrong once genuinely different
 * NZ/AU prices exist: an AU-region line would have been charged NZ prices.
 */
async function resolveTierForRegion(
  region: Region,
  assignedTier: PricingTier | null,
): Promise<PricingTier | null> {
  if (assignedTier && assignedTier.region === region) return assignedTier;
  return prisma.pricingTier.findFirst({ where: { region } });
}

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
  const assignedTier = await prisma.pricingTier.findUnique({ where: { id: customer.pricingTierId } });

  // A customer not flagged for both regions can't split their cart no
  // matter what the client sends - every item goes to their account region.
  const normalizedItems = customer.shipsToBothRegions
    ? items
    : items.map((item) => ({ ...item, region: customer.region }));

  const itemsByRegion = new Map<Region, CartItemInput[]>();
  for (const item of normalizedItems) {
    const list = itemsByRegion.get(item.region) ?? [];
    list.push(item);
    itemsByRegion.set(item.region, list);
  }

  // Resolve each region's tier and prices, and check the minimum order
  // value, before creating ANY orders - a submission that would leave one
  // region below its minimum should fail entirely, not partially.
  const regionPlans: Array<{
    region: Region;
    items: CartItemInput[];
    priceByProductId: Map<string, number>;
    totalAmount: number;
  }> = [];

  for (const [region, regionItems] of itemsByRegion) {
    const tier = await resolveTierForRegion(region, assignedTier);
    if (!tier) {
      throw new CheckoutError(
        `There's no ${region} price list set up yet - contact Sweet Disorder to place an ${region} order.`,
      );
    }

    const productIds = [...new Set(regionItems.map((item) => item.productId))];
    const priceRows = await prisma.pricingTierProduct.findMany({
      where: { pricingTierId: tier.id, productId: { in: productIds } },
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
        `${names} ${unpriced.length === 1 ? "isn't" : "aren't"} available in the ${region} price list - please remove ${unpriced.length === 1 ? "it" : "them"} from your cart and try again.`,
      );
    }

    const totalAmount = regionItems.reduce(
      (sum, item) => sum + priceByProductId.get(item.productId)! * item.quantity,
      0,
    );

    if (tier.minimumOrderValue !== null && totalAmount < Number(tier.minimumOrderValue)) {
      throw new CheckoutError(
        `Your ${region} order total is $${totalAmount.toFixed(2)}, below the $${Number(tier.minimumOrderValue).toFixed(2)} ${region} minimum order value. Add more items or contact Sweet Disorder.`,
      );
    }

    regionPlans.push({ region, items: regionItems, priceByProductId, totalAmount });
  }

  const createdOrders: CreatedOrder[] = [];
  for (const { region, items: regionItems, priceByProductId, totalAmount } of regionPlans) {
    const lineItems = regionItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: priceByProductId.get(item.productId)!,
    }));

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
