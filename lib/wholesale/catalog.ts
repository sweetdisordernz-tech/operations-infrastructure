import { prisma } from "@/lib/db";
import type { PackagingType, WholesaleCustomer } from "@prisma/client";

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
  imageBlobUrl: string | null;
};

export type WholesaleCatalog = {
  products: WholesaleCatalogProduct[];
  ranges: Array<{ id: string; name: string }>;
  fillings: Array<{ id: string; name: string }>;
};

const EMPTY_CATALOG: WholesaleCatalog = { products: [], ranges: [], fillings: [] };

export async function getWholesaleCatalog(
  customer: Pick<WholesaleCustomer, "pricingTierId">,
): Promise<WholesaleCatalog> {
  if (!customer.pricingTierId) return EMPTY_CATALOG;

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

  const catalogProducts: WholesaleCatalogProduct[] = products.map((product) => ({
    productId: product.id,
    sku: product.sku,
    name: product.name,
    rangeId: product.rangeId,
    rangeName: product.range.name,
    packagingType: product.packagingType,
    fillingId: product.fillingId,
    fillingName: product.filling?.name ?? null,
    minOrderQty: product.minOrderQty,
    // Guaranteed present by the `some` filter above.
    price: Number(product.pricingTierProducts[0].price),
    imageBlobUrl: product.imageBlobUrl,
  }));

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
