import { readFileSync } from "fs";
import { createHmac } from "crypto";
import { resolve } from "path";

/**
 * Posts a sample Shopify order payload to the local webhook endpoint with a
 * correctly computed HMAC signature, so the whole ingestion flow can be
 * exercised before a real Shopify store is connected.
 *
 * Usage:
 *   npm run test:webhook
 *   npm run test:webhook -- --topic=orders/updated
 *   npm run test:webhook -- --file=path/to/other-payload.json
 *   npm run test:webhook -- --url=https://your-deployment.vercel.app/api/webhooks/shopify
 *
 * Requires SHOPIFY_WEBHOOK_SECRET in the environment (or .env) matching
 * whatever the running server has configured - see .env.example.
 */

function parseArgs() {
  const args = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args.set(match[1], match[2]);
  }
  return {
    topic: args.get("topic") ?? "orders/create",
    file: args.get("file") ?? "prisma/data/sample-shopify-order.json",
    url: args.get("url") ?? process.env.WEBHOOK_TEST_URL ?? "http://localhost:3000/api/webhooks/shopify",
  };
}

async function main() {
  const { topic, file, url } = parseArgs();

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("SHOPIFY_WEBHOOK_SECRET is not set. Add it to .env (see .env.example) first.");
    process.exit(1);
  }

  const payloadPath = resolve(process.cwd(), file);
  const rawBody = readFileSync(payloadPath, "utf8");

  const hmac = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");

  console.log(`POST ${url}`);
  console.log(`  topic: ${topic}`);
  console.log(`  payload: ${payloadPath}`);
  console.log(`  x-shopify-hmac-sha256: ${hmac}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Topic": topic,
      "X-Shopify-Hmac-Sha256": hmac,
    },
    body: rawBody,
  });

  const text = await res.text();
  console.log(`\nResponse: ${res.status} ${res.statusText}`);
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }

  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
