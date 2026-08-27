import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createOrder, OrderValidationError } from "@/lib/orders/create-order";
import {
  inferPaymentStatus,
  mapShopifyOrderToOrderInput,
  verifyShopifyHmac,
  type ShopifyOrderPayload,
} from "@/lib/integrations/shopify";

/**
 * Shopify order webhook intake (orders/create, orders/updated).
 *
 * Idempotent on `shopify_order_id`: a retried/duplicate webhook for an order
 * we've already recorded updates the existing row instead of creating a
 * second one. New orders decrement inventory via the shared createOrder
 * service; updates only touch payment/total fields - re-running inventory
 * decrement on every update webhook would double-count stock.
 */

async function logSync(params: {
  status: "SUCCESS" | "FAILURE" | "PARTIAL";
  payloadSummary?: string;
  errorMessage?: string;
}) {
  await prisma.integrationSyncLog.create({
    data: {
      integration: "SHOPIFY",
      direction: "INBOUND",
      status: params.status,
      payloadSummary: params.payloadSummary,
      errorMessage: params.errorMessage,
    },
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("SHOPIFY_WEBHOOK_SECRET is not set - rejecting webhook");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyHmac(rawBody, hmacHeader, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: ShopifyOrderPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const shopifyOrderId = String(payload.id);

  try {
    const existing = await prisma.order.findUnique({ where: { shopifyOrderId } });

    if (existing) {
      // Update path: refresh mutable fields only. Never touch line items,
      // tasks, or inventory here - those are set once at creation.
      await prisma.order.update({
        where: { id: existing.id },
        data: {
          totalAmount: Number(payload.total_price),
          paymentStatus: inferPaymentStatus(payload),
        },
      });

      await logSync({
        status: "SUCCESS",
        payloadSummary: `Updated order ${existing.orderNumber} (shopify_order_id=${shopifyOrderId})`,
      });
      return NextResponse.json({ ok: true, orderId: existing.id, action: "updated" });
    }

    const { orderInput, unmatchedItems, matchedCount, totalCount } =
      await mapShopifyOrderToOrderInput(payload);

    if (!orderInput) {
      await logSync({
        status: "FAILURE",
        errorMessage: `No line items matched a known SKU for shopify_order_id=${shopifyOrderId}`,
        payloadSummary: JSON.stringify({ shopifyOrderId, unmatchedItems }),
      });
      // Not our bug and not worth Shopify retrying forever - acknowledge receipt.
      return NextResponse.json({
        ok: true,
        action: "skipped",
        reason: "no matching products",
      });
    }

    let created;
    try {
      created = await createOrder(orderInput);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Race: another delivery of the same webhook created it first.
        const raceExisting = await prisma.order.findUnique({ where: { shopifyOrderId } });
        await logSync({
          status: "SUCCESS",
          payloadSummary: `Order ${shopifyOrderId} already created by a concurrent webhook delivery`,
        });
        return NextResponse.json({ ok: true, orderId: raceExisting?.id, action: "already_exists" });
      }
      throw err;
    }

    if (unmatchedItems.length > 0) {
      await logSync({
        status: "PARTIAL",
        errorMessage: `${unmatchedItems.length}/${totalCount} line item(s) had no matching product SKU`,
        payloadSummary: JSON.stringify({
          orderId: created.id,
          orderNumber: created.orderNumber,
          shopifyOrderId,
          unmatchedItems,
        }),
      });
    } else {
      await logSync({
        status: "SUCCESS",
        payloadSummary: `Created order ${created.orderNumber} with ${matchedCount} line item(s)`,
      });
    }

    return NextResponse.json({
      ok: true,
      orderId: created.id,
      action: "created",
      matchedLineItems: matchedCount,
      unmatchedLineItems: unmatchedItems,
    });
  } catch (err) {
    if (err instanceof OrderValidationError) {
      await logSync({
        status: "FAILURE",
        errorMessage: err.message,
        payloadSummary: JSON.stringify({ shopifyOrderId, details: err.details }),
      });
      return NextResponse.json({ ok: true, action: "skipped", reason: err.message });
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Shopify webhook processing failed:", err);
    await logSync({
      status: "FAILURE",
      errorMessage: message,
      payloadSummary: JSON.stringify({ shopifyOrderId }),
    }).catch(() => {
      // Logging failure shouldn't mask the original error response.
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
