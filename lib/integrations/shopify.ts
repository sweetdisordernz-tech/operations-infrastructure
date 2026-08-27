import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import type { CreateOrderInput } from "@/lib/orders/create-order";

/**
 * Shopify webhook signature verification + payload -> internal order shape
 * mapping. Kept separate from the route handler so the mapping logic (SKU
 * resolution, region/payment-status inference) is unit-testable and reused
 * if we ever backfill orders from the Shopify Admin API instead of just
 * webhooks.
 */

export function verifyShopifyHmac(
  rawBody: string,
  hmacHeader: string | null,
  secret: string,
): boolean {
  if (!hmacHeader) return false;

  const computed = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");

  const a = Buffer.from(computed);
  const b = Buffer.from(hmacHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Only the fields we actually read - Shopify's real payload has many more.
export type ShopifyOrderPayload = {
  id: number | string;
  name?: string;
  order_number?: number | string;
  currency: string;
  total_price: string;
  financial_status?: string;
  created_at: string;
  line_items: Array<{
    sku: string | null;
    quantity: number;
    price: string;
    title: string;
  }>;
  shipping_address?: { country_code?: string | null } | null;
  billing_address?: { country_code?: string | null } | null;
};

export type UnmatchedLineItem = {
  sku: string | null;
  title: string;
  quantity: number;
  price: string;
};

export type MappedShopifyOrder = {
  /** null when every line item failed to match a product - nothing to create. */
  orderInput: CreateOrderInput | null;
  unmatchedItems: UnmatchedLineItem[];
  matchedCount: number;
  totalCount: number;
};

const PAID_FINANCIAL_STATUSES = new Set(["paid", "partially_refunded", "refunded"]);

function inferRegion(payload: ShopifyOrderPayload): "NZ" | "AU" {
  const countryCode =
    payload.shipping_address?.country_code ?? payload.billing_address?.country_code;
  return countryCode === "AU" ? "AU" : "NZ";
}

export function inferPaymentStatus(payload: ShopifyOrderPayload): "PAID" | "AWAITING_INVOICE" {
  return payload.financial_status && PAID_FINANCIAL_STATUSES.has(payload.financial_status)
    ? "PAID"
    : "AWAITING_INVOICE";
}

function orderNumberFor(payload: ShopifyOrderPayload): string {
  if (payload.name) return payload.name;
  if (payload.order_number !== undefined) return `#${payload.order_number}`;
  return `SHOPIFY-${payload.id}`;
}

export async function mapShopifyOrderToOrderInput(
  payload: ShopifyOrderPayload,
): Promise<MappedShopifyOrder> {
  const skus = [
    ...new Set(payload.line_items.map((item) => item.sku).filter((sku): sku is string => !!sku)),
  ];

  const products = skus.length > 0 ? await prisma.product.findMany({ where: { sku: { in: skus } } }) : [];
  const productBySku = new Map(products.map((p) => [p.sku!, p]));

  const matchedLineItems: CreateOrderInput["lineItems"] = [];
  const unmatchedItems: UnmatchedLineItem[] = [];

  for (const item of payload.line_items) {
    const product = item.sku ? productBySku.get(item.sku) : undefined;
    if (!product) {
      unmatchedItems.push({
        sku: item.sku,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
      });
      continue;
    }
    matchedLineItems.push({
      productId: product.id,
      quantity: item.quantity,
      unitPrice: Number(item.price),
    });
  }

  const orderInput: CreateOrderInput | null =
    matchedLineItems.length === 0
      ? null
      : {
          orderNumber: orderNumberFor(payload),
          source: "SHOPIFY",
          region: inferRegion(payload),
          shopifyOrderId: String(payload.id),
          paymentPhase: "PORTAL_PAYMENT",
          paymentStatus: inferPaymentStatus(payload),
          totalAmount: Number(payload.total_price),
          currency: payload.currency,
          placedAt: new Date(payload.created_at),
          lineItems: matchedLineItems,
          // Shopify orders are already-completed retail sales; min_order_qty
          // is a wholesale case-pack concept and doesn't apply here.
          skipMinOrderQtyValidation: true,
        };

  return {
    orderInput,
    unmatchedItems,
    matchedCount: matchedLineItems.length,
    totalCount: payload.line_items.length,
  };
}
