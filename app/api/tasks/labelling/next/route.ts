import { NextResponse } from "next/server";
import { requireStaffUser, authErrorResponse } from "@/lib/auth/guards";
import { getNextLabellingBatch } from "@/lib/tasks/labelling";

export async function GET() {
  try {
    await requireStaffUser();
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batch = await getNextLabellingBatch();
  return NextResponse.json({ batch });
}
