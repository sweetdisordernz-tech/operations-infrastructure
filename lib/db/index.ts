import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// Neon's serverless driver needs a WebSocket implementation outside the
// browser/edge runtime (e.g. in a Node.js server context, scripts, seed).
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Same reasoning as BREVO_TIMEOUT_MS (lib/email/index.ts) and
 * BLOB_UPLOAD_TIMEOUT_MS (lib/integrations/xero.ts): without an explicit
 * bound, a stalled connection or slow query can hang a request indefinitely,
 * which on Vercel means the whole serverless function runs past its
 * execution limit and gets killed by the platform - returning a non-JSON
 * error page instead of ever reaching application code's own error
 * handling. Every request touches the DB, so this is the highest-value
 * place to have a bound, not just the external integrations.
 *
 * Connection timeout is deliberately more generous than the query timeout:
 * Neon's free/serverless tier suspends its compute after idling, and the
 * first connection after a suspend has to wake it back up, which can take
 * noticeably longer than a normal connection. A bound that's too tight here
 * turns a legitimate (if slow) cold start into a hard failure instead of
 * just being a bit slow. Once actually connected, an individual query
 * should be fast, so that bound can stay tighter.
 */
const DB_CONNECTION_TIMEOUT_MS = 15_000;
const DB_QUERY_TIMEOUT_MS = 10_000;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaNeon({
    connectionString,
    connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
    query_timeout: DB_QUERY_TIMEOUT_MS,
  });
  return new PrismaClient({ adapter });
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Lazily instantiated on first actual use (e.g. `prisma.user.findMany(...)`)
// rather than at module load, so `next build` doesn't need DATABASE_URL set
// just to trace/bundle routes that are dynamically rendered anyway.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrismaClient(), prop, receiver);
  },
});
