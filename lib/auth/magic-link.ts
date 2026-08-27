import { prisma } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email";
import { generateRawToken, hashToken } from "@/lib/auth/tokens";
import type { Surface } from "@/lib/subdomains";

const TOKEN_TTL_MINUTES = 15;

export type MagicLinkAudience = "wholesale" | "staff";

type RequestResult =
  | { ok: true }
  // Always return { ok: true } to the caller regardless of whether the
  // email matched an account, so this endpoint can't be used to enumerate
  // registered emails.
  | { ok: false; reason: string };

export async function requestMagicLink(
  email: string,
  audience: MagicLinkAudience,
  surface: Surface,
  baseUrl: string,
): Promise<RequestResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { ok: false, reason: "Invalid email" };
  }

  const wholesaleCustomer =
    audience === "wholesale"
      ? await prisma.wholesaleCustomer.findUnique({ where: { email: normalizedEmail } })
      : null;
  const user =
    audience === "staff"
      ? await prisma.user.findUnique({ where: { email: normalizedEmail } })
      : null;

  // Don't reveal whether the account exists - silently no-op but still
  // return ok:true. Nothing is emailed/logged in that case.
  if (audience === "wholesale" && !wholesaleCustomer) return { ok: true };
  if (audience === "staff" && (!user || user.role !== "OWNER_ADMIN" || !user.active)) {
    return { ok: true };
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.magicLinkToken.create({
    data: {
      email: normalizedEmail,
      tokenHash,
      expiresAt,
      userId: user?.id,
      wholesaleCustomerId: wholesaleCustomer?.id,
    },
  });

  const magicLinkUrl = `${baseUrl}/api/auth/magic-link/verify?token=${rawToken}&audience=${audience}&surface=${surface}`;
  await sendMagicLinkEmail(normalizedEmail, magicLinkUrl);

  return { ok: true };
}

export type ConsumeResult =
  | { ok: true; userId: string | null; wholesaleCustomerId: string | null }
  | { ok: false; reason: string };

export async function consumeMagicLinkToken(rawToken: string): Promise<ConsumeResult> {
  if (!rawToken) return { ok: false, reason: "Missing token" };

  const tokenHash = hashToken(rawToken);
  const record = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });

  if (!record) return { ok: false, reason: "Invalid token" };
  if (record.usedAt) return { ok: false, reason: "Token already used" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "Token expired" };

  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { ok: true, userId: record.userId, wholesaleCustomerId: record.wholesaleCustomerId };
}
