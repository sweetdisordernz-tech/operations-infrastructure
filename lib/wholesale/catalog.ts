import { prisma } from "@/lib/db";
import { getCanonicalTierForRegion } from "@/lib/wholesale/pricing";
import type { PackagingType, Region, WholesaleCustomer } from "@prisma/client";

/**
 * The wholesale-visible, priced catalog for a given customer. A product
 * only appears here if it's active, wholesale_visible, AND has a
 * PricingTierProduct row for the customer's tier - no price means "not
 * orderable yet", so it's excluded entirely rather than shown disabled or
 * falling back to a guessed/retail price.
 */

export type WholesaleCatalogProduct = {
  productId: string;
  sku: string | null;
  name: string;
  rangeId: string;
  rangeName: string;
  packagingType: PackagingType;
  fillingId: string | null;
  fillingName: string | null;
  minOrderQty: number;
  price: number;
  /**
   * Price per region, for the cart's live preview when a shipsToBothRegions
   * customer toggles a line's region. Always includes the home tier's
   * region (same value as `price`); includes the other region too only
   * when this product has a price there and the customer ships to both -
   * a product with no AU price, say, just won't have an AU entry, and the
   * cart treats that the same way checkout.ts does (unavailable in that
   * region, not silently priced from the wrong tier).
   */
  priceByRegion: Partial<Record<Region, number>>;
  imageBlobUrl: string | null;
  /**
   * Trailing-12-month sales rank (lower = more popular), null for a
   * product with no sales history yet. Drives the catalog's "Most
   * Popular" sort - see CatalogBrowser, which sorts null ranks to the end
   * rather than treating them as rank 0.
   */
  salesRank: number | null;
};

export type WholesaleCatalog = {
  products: WholesaleCatalogProduct[];
  ranges: Array<{ id: string; name: string }>;
  fillings: Array<{ id: string; name: string }>;
};

const EMPTY_CATALOG: WholesaleCatalog = { products: [], ranges: [], fillings: [] };

export async function getWholesaleCatalog(
  customer: Pick<WholesaleCustomer, "pricingTierId" | "shipsToBothRegions">,
): Promise<WholesaleCatalog> {
  if (!customer.pricingTierId) return EMPTY_CATALOG;

  const homeTier = await prisma.pricingTier.findUnique({ where: { id: customer.pricingTierId } });
  if (!homeTier) return EMPTY_CATALOG;

  const products = await prisma.product.findMany({
    where: {
      active: true,
      wholesaleVisible: true,
      pricingTierProducts: { some: { pricingTierId: customer.pricingTierId } },
    },
    include: {
      range: true,
      filling: true,
      pricingTierProducts: { where: { pricingTierId: customer.pricingTierId } },
    },
    orderBy: { name: "asc" },
  });

  // Only fetched when it can actually matter: a customer who doesn't ship
  // to both regions never sees a region toggle in the cart at all, so
  // there's nothing for the "other" region's price to do for them.
  const otherRegionPriceByProductId = new Map<string, number>();
  if (customer.shipsToBothRegions) {
    const otherRegion: Region = homeTier.region === "NZ" ? "AU" : "NZ";
    const otherTier = await getCanonicalTierForRegion(otherRegion);
    if (otherTier) {
      const otherRows = await prisma.pricingTierProduct.findMany({
        where: { pricingTierId: otherTier.id, productId: { in: products.map((p) => p.id) } },
      });
      for (const row of otherRows) {
        otherRegionPriceByProductId.set(row.productId, Number(row.price));
      }
    }
  }

  const catalogProducts: WholesaleCatalogProduct[] = products.map((product) => {
    // Guaranteed present by the `some` filter above.
    const homePrice = Number(product.pricingTierProducts[0].price);
    const priceByRegion: Partial<Record<Region, number>> = { [homeTier.region]: homePrice };
    const otherPrice = otherRegionPriceByProductId.get(product.id);
    if (otherPrice !== undefined) {
      priceByRegion[homeTier.region === "NZ" ? "AU" : "NZ"] = otherPrice;
    }

    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      rangeId: product.rangeId,
      rangeName: product.range.name,
      packagingType: product.packagingType,
      fillingId: product.fillingId,
      fillingName: product.filling?.name ?? null,
      minOrderQty: product.minOrderQty,
      price: homePrice,
      priceByRegion,
      imageBlobUrl: product.imageBlobUrl,
      salesRank: product.salesRank,
    };
  });

  const ranges = [
    ...new Map(catalogProducts.map((p) => [p.rangeId, { id: p.rangeId, name: p.rangeName }])).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const fillings = [
    ...new Map(
      catalogProducts
        .filter((p): p is WholesaleCatalogProduct & { fillingId: string; fillingName: string } =>
          Boolean(p.fillingId && p.fillingName),
        )
        .map((p) => [p.fillingId, { id: p.fillingId, name: p.fillingName }]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return { products: catalogProducts, ranges, fillings };
}
