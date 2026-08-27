import { NextResponse } from "next/server";

// Product + filling inventory levels and reorder thresholds.
// Built out in a later stage.
export async function GET() {
  return NextResponse.json({ message: "Inventory API - not yet implemented" }, { status: 501 });
}
