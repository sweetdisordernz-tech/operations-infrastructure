import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestMagicLink, type MagicLinkAudience } from "@/lib/auth/magic-link";
import { SURFACES } from "@/lib/subdomains";

const bodySchema = z.object({
  email: z.string().email(),
  audience: z.enum(["wholesale", "staff"]),
  // Which surface to land on after clicking the emailed link, e.g. a staff
  // member requesting a link from the admin login vs. the ops login.
  surface: z.enum(SURFACES),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, audience, surface } = parsed.data;
  const isWholesaleSurface = surface === "wholesale";
  if ((audience === "wholesale") !== isWholesaleSurface) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const baseUrl = new URL(request.url).origin;

  await requestMagicLink(email, audience as MagicLinkAudience, surface, baseUrl);

  // Always the same response, whether or not the email matched an account.
  return NextResponse.json({
    ok: true,
    message: "If that email is registered, a sign-in link has been sent.",
  });
}
