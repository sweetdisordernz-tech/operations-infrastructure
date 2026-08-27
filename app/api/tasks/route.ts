import { NextResponse } from "next/server";

// Order task (labelling/packing/dispatch) listing + status updates for the
// floor checklist app. Built out in a later stage.
export async function GET() {
  return NextResponse.json({ message: "Tasks API - not yet implemented" }, { status: 501 });
}
