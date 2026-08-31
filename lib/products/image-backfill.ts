import { put } from "@vercel/blob";
import type { PrismaClient } from "@prisma/client";

/**
 * Backfills Product.imageBlobUrl from the live sweetdisorder.co.nz Shopify
 * storefront's public products.json feed (no auth needed - standard Shopify
 * storefront JSON API), matched to our own Product rows by exact normalized
 * name. Run as a step inside prisma/seed.ts (see bottom of that file) so it
 * executes automatically on every `npm run db:seed`, same as every other
 * seed step - no manual/one-off script.
 */

const SHOPIFY_STORE_URL = "https://sweetdisorder.co.nz";
const PRODUCTS_PER_PAGE = 250;
const MAX_PAGES = 40; // safety cap - the real catalog is ~100 products, well under this

/**
 * Same reasoning as BREVO_TIMEOUT_MS (lib/email/index.ts) and
 * BLOB_UPLOAD_TIMEOUT_MS (lib/integrations/xero.ts): a plain fetch() has no
 * default timeout, so a stalled endpoint can hang a build step indefinitely.
 * This runs during `prisma db seed` at deploy time, not a request handler,
 * so the cost of a slow/dead network call is a stuck deploy rather than a
 * 500 - still worth bounding.
 */
const SHOPIFY_FETCH_TIMEOUT_MS = 15_000;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 15_000;
const BLOB_UPLOAD_TIMEOUT_MS = 15_000;

type ShopifyImage = { src?: string | null };
type ShopifyProduct = {
  title?: string;
  image?: ShopifyImage | null;
  images?: ShopifyImage[] | null;
  featured_image?: string | ShopifyImage | null;
};
type ShopifyProductsResponse = { products?: ShopifyProduct[] };

/**
 * Normalizes a product name for matching: unicode-normalize (so curly
 * quotes/accents behave predictably), lowercase, then collapse every run of
 * non-alphanumeric characters (spaces, punctuation, quotes, dashes,
 * asterisks, ampersands, commas...) into a single space and trim. Applied
 * identically to both our catalog names and Shopify's titles, so it only
 * needs to be "consistent", not semantically perfect - e.g. "Anti-aging"
 * and "Anti Aging" both normalize to "anti aging", and "A**hole antidote"
 * normalizes the same way regardless of exactly how the asterisks/spacing
 * were typed on either side.
 */
export function normalizeProductName(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function extractImageUrl(product: ShopifyProduct): string | null {
  if (product.image?.src) return product.image.src;
  const firstImage = product.images?.[0]?.src;
  if (firstImage) return firstImage;

  const featured = product.featured_image;
  if (typeof featured === "string" && featured) return featured;
  if (featured && typeof featured === "object" && featured.src) return featured.src;

  return null;
}

async function fetchAllShopifyProducts(): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${SHOPIFY_STORE_URL}/products.json?limit=${PRODUCTS_PER_PAGE}&page=${page}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(SHOPIFY_FETCH_TIMEOUT_MS) });
    if (!response.ok) {
      throw new Error(`Shopify products.json returned HTTP ${response.status} on page ${page}`);
    }

    const data = (await response.json()) as ShopifyProductsResponse;
    const products = data.products ?? [];
    if (products.length === 0) break;

    all.push(...products);
    if (products.length < PRODUCTS_PER_PAGE) break; // short page = last page
  }

  return all;
}

export type ImageBackfillSummary = {
  matchedAndUpdated: number;
  alreadyHadImage: number;
  matchedButFailed: Array<{ name: string; reason: string }>;
  unmatched: string[];
};

/**
 * Never throws - a total feed failure (network blocked, non-2xx, bad JSON)
 * is logged and treated as a no-op so it can never block the rest of
 * prisma/seed.ts. Idempotent: only considers Product rows where
 * imageBlobUrl is still null, so re-running never re-downloads/re-uploads
 * anything already backfilled.
 */
export async function backfillProductImages(prisma: PrismaClient): Promise<ImageBackfillSummary> {
  const summary: ImageBackfillSummary = {
    matchedAndUpdated: 0,
    alreadyHadImage: 0,
    matchedButFailed: [],
    unmatched: [],
  };

  let shopifyProducts: ShopifyProduct[];
  try {
    shopifyProducts = await fetchAllShopifyProducts();
  } catch (err) {
    console.error(
      "Product image backfill: could not reach the live Shopify products.json feed - skipping " +
        "(expected in sandboxes with restricted network egress; this should succeed on a real Vercel deploy):",
      err instanceof Error ? err.message : err,
    );
    return summary;
  }

  const shopifyByNormalizedName = new Map<string, { title: string; imageUrl: string }>();
  for (const product of shopifyProducts) {
    if (!product.title) continue;
    const imageUrl = extractImageUrl(product);
    if (!imageUrl) continue;

    const key = normalizeProductName(product.title);
    // First match wins on a collision within Shopify's own catalog (e.g. two
    // variants of a discontinued/duplicate listing) - doesn't affect
    // matching against our DB, which is keyed by our own product names.
    if (!shopifyByNormalizedName.has(key)) {
      shopifyByNormalizedName.set(key, { title: product.title, imageUrl });
    }
  }

  const dbProducts = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, imageBlobUrl: true },
  });

  for (const product of dbProducts) {
    if (product.imageBlobUrl) {
      summary.alreadyHadImage++;
      continue;
    }

    const match = shopifyByNormalizedName.get(normalizeProductName(product.name));
    if (!match) {
      summary.unmatched.push(product.name);
      continue;
    }

    try {
      const imageResponse = await fetch(match.imageUrl, {
        signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS),
      });
      if (!imageResponse.ok) {
        throw new Error(`image download returned HTTP ${imageResponse.status}`);
      }
      const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
      const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
      const blobKey = `product-images/${product.sku ?? product.id}.jpg`;

      const blob = await put(blobKey, imageBytes, {
        access: "public",
        contentType,
        abortSignal: AbortSignal.timeout(BLOB_UPLOAD_TIMEOUT_MS),
      });

      await prisma.product.update({
        where: { id: product.id },
        data: { imageBlobUrl: blob.url },
      });

      summary.matchedAndUpdated++;
    } catch (err) {
      summary.matchedButFailed.push({
        name: product.name,
        reason: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return summary;
}
