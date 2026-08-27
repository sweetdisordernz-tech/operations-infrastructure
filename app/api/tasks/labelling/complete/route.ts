import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffUser, authErrorResponse } from "@/lib/auth/guards";
import { completeLabellingBatch } from "@/lib/tasks/labelling";

const bodySchema = z.object({ productId: z.string().min(1) });

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireStaffUser();
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const result = await completeLabellingBatch(parsed.data.productId, user.id);
  return NextResponse.json({ ok: true, ...result });
}
