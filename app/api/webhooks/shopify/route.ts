import { NextResponse } from "next/server";

// Shopify order/customer webhook intake. Signature verification and
// order/inventory sync land in a later stage (integrations).
export async function POST() {
  return NextResponse.json({ ok: true, message: "Shopify webhook stub - not yet implemented" });
}
