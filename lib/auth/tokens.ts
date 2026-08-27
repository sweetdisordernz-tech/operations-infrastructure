import { randomBytes, createHash } from "crypto";

/** Raw token handed to the user (in the magic link URL); never stored as-is. */
export function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hash of a raw token, safe to store in the database. */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
