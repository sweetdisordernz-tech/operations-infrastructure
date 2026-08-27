import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaffUser, authErrorResponse } from "@/lib/auth/guards";
import type { OrderStatus, Region, OrderSource, Prisma } from "@prisma/client";

const VALID_STATUSES: OrderStatus[] = ["PENDING", "LABELLING", "PACKING", "DISPATCHED"];
const VALID_REGIONS: Region[] = ["NZ", "AU"];
const VALID_SOURCES: OrderSource[] = ["SHOPIFY", "WHOLESALE_PORTAL"];

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * GET /api/orders?status=&region=&source=&limit=&offset=
 * Staff-only (owner/admin) for now. Backs Master Connect + Molly's
 * dashboard order views in a later stage.
 */
export async function GET(request: NextRequest) {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const region = searchParams.get("region");
  const source = searchParams.get("source");

  if (status && !VALID_STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json({ error: `Invalid status. Expected one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }
  if (region && !VALID_REGIONS.includes(region as Region)) {
    return NextResponse.json({ error: `Invalid region. Expected one of: ${VALID_REGIONS.join(", ")}` }, { status: 400 });
  }
  if (source && !VALID_SOURCES.includes(source as OrderSource)) {
    return NextResponse.json({ error: `Invalid source. Expected one of: ${VALID_SOURCES.join(", ")}` }, { status: 400 });
  }

  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status: status as OrderStatus } : {}),
    ...(region ? { region: region as Region } : {}),
    ...(source ? { source: source as OrderSource } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        wholesaleCustomer: { select: { id: true, companyName: true } },
        _count: { select: { lineItems: true } },
        tasks: { select: { stage: true, status: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      source: order.source,
      region: order.region,
      status: order.status,
      paymentPhase: order.paymentPhase,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      currency: order.currency,
      placedAt: order.placedAt,
      wholesaleCustomer: order.wholesaleCustomer,
      lineItemCount: order._count.lineItems,
      tasks: order.tasks,
    })),
    pagination: { limit, offset, total },
  });
}
