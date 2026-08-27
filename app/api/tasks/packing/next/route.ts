import { NextResponse } from "next/server";
import { requireStaffUser, authErrorResponse } from "@/lib/auth/guards";
import { getNextPackingOrder } from "@/lib/tasks/packing";

export async function GET() {
  try {
    await requireStaffUser();
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = await getNextPackingOrder();
  return NextResponse.json({ order });
}
