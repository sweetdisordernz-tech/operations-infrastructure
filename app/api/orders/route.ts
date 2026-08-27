import { NextResponse } from "next/server";

// Order listing/creation across Shopify + wholesale-portal sources.
// Built out in a later stage.
export async function GET() {
  return NextResponse.json({ message: "Orders API - not yet implemented" }, { status: 501 });
}
