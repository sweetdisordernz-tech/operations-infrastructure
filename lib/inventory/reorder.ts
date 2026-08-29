import { prisma } from "@/lib/db";
import { sendLowStockAlertEmail } from "@/lib/email";

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

/** Cheap snapshot of which productIds/fillingIds currently need reordering - captured before an order decrements stock, so the state after can be diffed for newly-crossed items. */
export async function getReorderIdSnapshot(): Promise<{ productIds: Set<string>; fillingIds: Set<string> }> {
  const [products, fillings] = await Promise.all([getProductsNeedingReorder(), getFillingsNeedingReorder()]);
  return {
    productIds: new Set(products.map((p) => p.productId)),
    fillingIds: new Set(fillings.map((f) => f.fillingId)),
  };
}

/**
 * Alerts every active OWNER_ADMIN user, once, if anything has newly dropped
 * to or below its reorder threshold since `before` was captured (brief
 * Section 6.4/14) - not on every order once something is already low, only
 * on the transition. Never throws - a failed alert must never block the
 * order that triggered the check.
 */
export async function notifyIfNewReorderNeeded(before: { productIds: Set<string>; fillingIds: Set<string> }): Promise<void> {
  try {
    const [products, fillings] = await Promise.all([getProductsNeedingReorder(), getFillingsNeedingReorder()]);

    const hasNewProduct = products.some((p) => !before.productIds.has(p.productId));
    const hasNewFilling = fillings.some((f) => !before.fillingIds.has(f.fillingId));
    if (!hasNewProduct && !hasNewFilling) return;

    const admins = await prisma.user.findMany({ where: { role: "OWNER_ADMIN", active: true } });
    for (const admin of admins) {
      await sendLowStockAlertEmail(admin.email, products, fillings);
    }
  } catch (err) {
    console.error("Failed to check/send low-stock reorder alert:", err);
  }
}
