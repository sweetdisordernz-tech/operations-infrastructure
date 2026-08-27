import { NextResponse } from "next/server";

// Label compliance record CRUD (allergen/address/origin/nutrition status).
// Built out in a later stage.
export async function GET() {
  return NextResponse.json(
    { message: "Label compliance API - not yet implemented" },
    { status: 501 },
  );
}
