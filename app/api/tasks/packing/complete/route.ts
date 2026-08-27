import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffUser, authErrorResponse } from "@/lib/auth/guards";
import { completePackingTask } from "@/lib/tasks/packing";
import { gatingErrorResponse } from "@/lib/tasks/shared";

const bodySchema = z.object({ orderId: z.string().min(1) });

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireStaffUser();
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  try {
    await completePackingTask(parsed.data.orderId, user.id);
  } catch (err) {
    return gatingErrorResponse(err) ?? NextResponse.json({ error: "Failed to complete packing" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
