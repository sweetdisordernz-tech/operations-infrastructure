import { prisma } from "@/lib/db";

/**
 * Which products/fillings currently need reordering (quantity_on_hand at or
 * below reorder_threshold). Pure read - no email/alert side effects here.
 * A later stage wires this into a Brevo alert job and/or a dashboard view.
 */

export type ProductReorderCandidate = {
  productId: string;
  sku: string | null;
  name: string;
  quantityOnHand: number;
  reorderThreshold: number;
  recommendedReorderQty: number | null;
};

export type FillingReorderCandidate = {
  fillingId: string;
  name: string;
  quantityOnHand: number;
  reorderThreshold: number;
};

export async function getProductsNeedingReorder(): Promise<ProductReorderCandidate[]> {
  const items = await prisma.inventoryItem.findMany({
    where: { reorderThreshold: { not: null } },
    include: { product: true },
  });

  return items
    .filter((item) => item.reorderThreshold !== null && item.quantityOnHand <= item.reorderThreshold)
    .map((item) => ({
      productId: item.productId,
      sku: item.product.sku,
      name: item.product.name,
      quantityOnHand: item.quantityOnHand,
      reorderThreshold: item.reorderThreshold!,
      recommendedReorderQty: item.recommendedReorderQty,
    }));
}

export async function getFillingsNeedingReorder(): Promise<FillingReorderCandidate[]> {
  const items = await prisma.fillingInventory.findMany({
    where: { reorderThreshold: { not: null } },
    include: { filling: true },
  });

  return items
    .filter((item) => item.reorderThreshold !== null && item.quantityOnHand.lte(item.reorderThreshold))
    .map((item) => ({
      fillingId: item.fillingId,
      name: item.filling.name,
      quantityOnHand: item.quantityOnHand.toNumber(),
      reorderThreshold: item.reorderThreshold!.toNumber(),
    }));
}

/** Does a single product need reordering right now? Cheap enough to call ad hoc (e.g. right after an order decrements stock). */
export async function checkProductReorder(productId: string): Promise<ProductReorderCandidate | null> {
  const item = await prisma.inventoryItem.findUnique({
    where: { productId },
    include: { product: true },
  });
  if (!item || item.reorderThreshold === null || item.quantityOnHand > item.reorderThreshold) {
    return null;
  }
  return {
    productId: item.productId,
    sku: item.product.sku,
    name: item.product.name,
    quantityOnHand: item.quantityOnHand,
    reorderThreshold: item.reorderThreshold,
    recommendedReorderQty: item.recommendedReorderQty,
  };
}

/** Does a single filling need reordering right now? */
export async function checkFillingReorder(fillingId: string): Promise<FillingReorderCandidate | null> {
  const item = await prisma.fillingInventory.findUnique({
    where: { fillingId },
    include: { filling: true },
  });
  if (!item || item.reorderThreshold === null || item.quantityOnHand.gt(item.reorderThreshold)) {
    return null;
  }
  return {
    fillingId: item.fillingId,
    name: item.filling.name,
    quantityOnHand: item.quantityOnHand.toNumber(),
    reorderThreshold: item.reorderThreshold.toNumber(),
  };
}
