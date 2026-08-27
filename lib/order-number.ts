import { randomBytes } from "crypto";

/** e.g. "WP-20260827-A1B2C3" - date-prefixed for readability, random suffix for uniqueness. */
export function generateOrderNumber(prefix = "WP"): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
}
