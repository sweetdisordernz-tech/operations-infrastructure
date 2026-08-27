import { NextResponse } from "next/server";
import { requireStaffUser, authErrorResponse } from "@/lib/auth/guards";
import { getNextDispatchOrder } from "@/lib/tasks/dispatch";

export async function GET() {
  try {
    await requireStaffUser();
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = await getNextDispatchOrder();
  return NextResponse.json({ order });
}
