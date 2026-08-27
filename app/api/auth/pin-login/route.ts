import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isValidPinFormat, verifyPin } from "@/lib/auth/pin";
import { setSessionCookie, STAFF_SESSION_COOKIE } from "@/lib/auth/session";

const bodySchema = z.object({
  pin: z.string(),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || !isValidPinFormat(parsed.data.pin)) {
    return NextResponse.json({ error: "Enter a 4-digit PIN" }, { status: 400 });
  }

  const { pin } = parsed.data;

  const candidates = await prisma.user.findMany({
    where: { active: true, role: "EMPLOYEE", pinHash: { not: null } },
  });

  for (const candidate of candidates) {
    // pinHash is guaranteed non-null by the query filter above.
    if (await verifyPin(pin, candidate.pinHash!)) {
      await setSessionCookie(STAFF_SESSION_COOKIE, candidate.id);
      return NextResponse.json({ ok: true, name: candidate.name });
    }
  }

  return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
}
