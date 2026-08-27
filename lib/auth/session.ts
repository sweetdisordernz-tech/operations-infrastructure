import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Minimal stateless signed session cookies (HMAC-SHA256), no external JWT
 * dependency. Two independent cookies keep staff and wholesale-customer
 * sessions from ever being confused with one another:
 *
 *   sd_staff_session     -> { sub: User.id }
 *   sd_wholesale_session -> { sub: WholesaleCustomer.id }
 */

export const STAFF_SESSION_COOKIE = "sd_staff_session";
export const WHOLESALE_SESSION_COOKIE = "sd_wholesale_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

type SessionPayload = {
  sub: string;
  iat: number;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return secret;
}

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

function sign(payload: string): string {
  return base64url(createHmac("sha256", getSecret()).update(payload).digest());
}

export function createSessionToken(subjectId: string): string {
  const payload: SessionPayload = { sub: subjectId, iat: Date.now() };
  const encodedPayload = base64url(Buffer.from(JSON.stringify(payload)));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function setSessionCookie(name: string, subjectId: string) {
  const store = await cookies();
  store.set(name, createSessionToken(subjectId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(name: string) {
  const store = await cookies();
  store.delete(name);
}

export async function readSessionSubject(name: string): Promise<string | null> {
  const store = await cookies();
  return verifySessionToken(store.get(name)?.value);
}
