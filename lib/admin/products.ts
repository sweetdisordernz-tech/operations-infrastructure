import { prisma } from "@/lib/db";
import { AdminValidationError } from "@/lib/admin/errors";
import type { PackagingType } from "@prisma/client";

/**
 * Full CRUD for the one Product table every surface reads from (brief
 * Section 5.1.1 - there is exactly one catalog, the wholesale portal is a
 * filtered view over it, never a separate synced copy). This is the
 * admin-side equivalent of the same editing Molly's dashboard gets in
 * stage 6.
 */

export type ProductRow = {
  id: string;
  sku: string | null;
  barcode: string | null;
  name: string;
  rangeId: string;
  rangeName: string;
  packagingType: PackagingType;
  fillingId: string | null;
  fillingName: string | null;
  minOrderQty: number;
  imageBlobUrl: string | null;
  active: boolean;
  discontinued: boolean;
  wholesaleVisible: boolean;
};

export async function getProducts(): Promise<ProductRow[]> {
  const products = await prisma.product.findMany({
    include: { range: true, filling: true },
    orderBy: { name: "asc" },
  });
  return products.map((product) => ({
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    rangeId: product.rangeId,
    rangeName: product.range.name,
    packagingType: product.packagingType,
    fillingId: product.fillingId,
    fillingName: product.filling?.name ?? null,
    minOrderQty: product.minOrderQty,
    imageBlobUrl: product.imageBlobUrl,
    active: product.active,
    discontinued: product.discontinued,
    wholesaleVisible: product.wholesaleVisible,
  }));
}

export async function getProduct(id: string): Promise<ProductRow | null> {
  const product = await prisma.product.findUnique({ where: { id }, include: { range: true, filling: true } });
  if (!product) return null;
  return {
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    rangeId: product.rangeId,
    rangeName: product.range.name,
    packagingType: product.packagingType,
    fillingId: product.fillingId,
    fillingName: product.filling?.name ?? null,
    minOrderQty: product.minOrderQty,
    imageBlobUrl: product.imageBlobUrl,
    active: product.active,
    discontinued: product.discontinued,
    wholesaleVisible: product.wholesaleVisible,
  };
}

export async function getRanges() {
  return prisma.productRange.findMany({ orderBy: { name: "asc" } });
}

export async function getFillings() {
  return prisma.filling.findMany({ orderBy: { name: "asc" } });
}

export async function createRange(name: string, skuPrefix: string) {
  const trimmedName = name.trim();
  const trimmedPrefix = skuPrefix.trim().toUpperCase();
  if (!trimmedName || !trimmedPrefix) {
    throw new AdminValidationError("Range name and SKU prefix are both required.");
  }
  return prisma.productRange.create({ data: { name: trimmedName, skuPrefix: trimmedPrefix } });
}

export async function createFilling(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new AdminValidationError("Filling name is required.");
  }
  const existing = await prisma.filling.findUnique({ where: { name: trimmedName } });
  if (existing) return existing;
  return prisma.filling.create({ data: { name: trimmedName } });
}

export type ProductInput = {
  name: string;
  rangeId: string;
  packagingType: PackagingType;
  fillingId: string | null;
  sku: string | null;
  barcode: string | null;
  minOrderQty: number;
  imageBlobUrl: string | null;
  wholesaleVisible: boolean;
  active: boolean;
  discontinued: boolean;
};

function validateProductInput(input: ProductInput) {
  if (!input.name.trim()) throw new AdminValidationError("Product name is required.");
  if (!input.rangeId) throw new AdminValidationError("Choose a range.");
  if (!Number.isInteger(input.minOrderQty) || input.minOrderQty < 1) {
    throw new AdminValidationError("Min order quantity must be a whole number of 1 or more.");
  }
}

export async function createProduct(input: ProductInput): Promise<ProductRow> {
  validateProductInput(input);

  if (input.sku) {
    const existing = await prisma.product.findUnique({ where: { sku: input.sku } });
    if (existing) throw new AdminValidationError(`SKU "${input.sku}" is already in use.`);
  }

  const product = await prisma.product.create({
    data: {
      name: input.name.trim(),
      rangeId: input.rangeId,
      packagingType: input.packagingType,
      fillingId: input.fillingId,
      sku: input.sku,
      barcode: input.barcode,
      minOrderQty: input.minOrderQty,
      imageBlobUrl: input.imageBlobUrl,
      wholesaleVisible: input.wholesaleVisible,
      active: input.active,
      discontinued: input.discontinued,
      inventoryItem: { create: { quantityOnHand: 0 } },
    },
    include: { range: true, filling: true },
  });

  return {
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    rangeId: product.rangeId,
    rangeName: product.range.name,
    packagingType: product.packagingType,
    fillingId: product.fillingId,
    fillingName: product.filling?.name ?? null,
    minOrderQty: product.minOrderQty,
    imageBlobUrl: product.imageBlobUrl,
    active: product.active,
    discontinued: product.discontinued,
    wholesaleVisible: product.wholesaleVisible,
  };
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  validateProductInput(input);

  if (input.sku) {
    const existing = await prisma.product.findUnique({ where: { sku: input.sku } });
    if (existing && existing.id !== id) throw new AdminValidationError(`SKU "${input.sku}" is already in use.`);
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AdminValidationError("That product no longer exists.");

  await prisma.product.update({
    where: { id },
    data: {
      name: input.name.trim(),
      rangeId: input.rangeId,
      packagingType: input.packagingType,
      fillingId: input.fillingId,
      sku: input.sku,
      barcode: input.barcode,
      minOrderQty: input.minOrderQty,
      imageBlobUrl: input.imageBlobUrl,
      wholesaleVisible: input.wholesaleVisible,
      active: input.active,
      discontinued: input.discontinued,
    },
  });
}

export async function deleteProduct(id: string): Promise<void> {
  const usageCount = await prisma.orderLineItem.count({ where: { productId: id } });
  if (usageCount > 0) {
    throw new AdminValidationError(
      "This product has order history and can't be deleted - mark it inactive instead.",
    );
  }

  await prisma.$transaction([
    prisma.pricingTierProduct.deleteMany({ where: { productId: id } }),
    prisma.labelComplianceRecord.deleteMany({ where: { productId: id } }),
    prisma.inventoryItem.deleteMany({ where: { productId: id } }),
    prisma.product.delete({ where: { id } }),
  ]);
}
