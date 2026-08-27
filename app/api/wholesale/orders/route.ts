import { NextResponse } from "next/server";
import { requireWholesaleCustomer, authErrorResponse } from "@/lib/auth/guards";
import { getCustomerOrders } from "@/lib/wholesale/orders";

/**
 * GET /api/wholesale/orders - this customer's own order history only.
 * Scoped at the query level inside getCustomerOrders (by the authenticated
 * customer's own id, never a client-supplied one) - a staff session can't
 * satisfy requireWholesaleCustomer at all, and there's no way for one
 * wholesale customer to see another's orders through this endpoint.
 */
export async function GET() {
  let customer;
  try {
    customer = await requireWholesaleCustomer();
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await getCustomerOrders(customer.id);
  return NextResponse.json({ orders });
}
