import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaffUser, authErrorResponse } from "@/lib/auth/guards";

/**
 * GET /api/orders/:id - single order detail with line items and task status.
 * Staff-only (owner/admin) for now. The wholesale customer's own
 * order-history view (customer-scoped, no cross-customer access) is a
 * later stage.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireStaffUser(["OWNER_ADMIN"]);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      wholesaleCustomer: { select: { id: true, companyName: true, email: true } },
      lineItems: {
        include: { product: { select: { id: true, sku: true, name: true, packagingType: true } } },
      },
      tasks: {
        include: { assignedEmployee: { select: { id: true, name: true } } },
        orderBy: { stage: "asc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
