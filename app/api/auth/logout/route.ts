import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  STAFF_SESSION_COOKIE,
  WHOLESALE_SESSION_COOKIE,
} from "@/lib/auth/session";

export async function POST() {
  await clearSessionCookie(STAFF_SESSION_COOKIE);
  await clearSessionCookie(WHOLESALE_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
