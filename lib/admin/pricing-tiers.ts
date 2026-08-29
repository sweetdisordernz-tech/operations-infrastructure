import { prisma } from "@/lib/db";
import { AdminValidationError } from "@/lib/admin/errors";
import type { Region } from "@prisma/client";

export async function getPricingTiers() {
  return prisma.pricingTier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { wholesaleCustomers: true, products: true } } },
  });
}

export async function getPricingTier(id: string) {
  return prisma.pricingTier.findUnique({
    where: { id },
    include: {
      products: { include: { product: true }, orderBy: { product: { name: "asc" } } },
    },
  });
}

export async function createPricingTier(name: string, region: Region) {
  const trimmed = name.trim();
  if (!trimmed) throw new AdminValidationError("Pricing tier name is required.");
  return prisma.pricingTier.create({ data: { name: trimmed, region } });
}

export async function updatePricingTier(id: string, name: string, region: Region) {
  const trimmed = name.trim();
  if (!trimmed) throw new AdminValidationError("Pricing tier name is required.");
  const existing = await prisma.pricingTier.findUnique({ where: { id } });
  if (!existing) throw new AdminValidationError("That pricing tier no longer exists.");
  await prisma.pricingTier.update({ where: { id }, data: { name: trimmed, region } });
}

export async function deletePricingTier(id: string) {
  const usage = await prisma.wholesaleCustomer.count({ where: { pricingTierId: id } });
  if (usage > 0) {
    throw new AdminValidationError("This pricing tier is assigned to wholesale customers - reassign them first.");
  }
  await prisma.$transaction([
    prisma.pricingTierProduct.deleteMany({ where: { pricingTierId: id } }),
    prisma.pricingTier.delete({ where: { id } }),
  ]);
}

export async function setTierProductPrice(pricingTierId: string, productId: string, price: number) {
  if (!Number.isFinite(price) || price < 0) {
    throw new AdminValidationError("Price must be a number of 0 or more.");
  }
  const [tier, product] = await Promise.all([
    prisma.pricingTier.findUnique({ where: { id: pricingTierId } }),
    prisma.product.findUnique({ where: { id: productId } }),
  ]);
  if (!tier || !product) throw new AdminValidationError("That pricing tier or product no longer exists.");

  await prisma.pricingTierProduct.upsert({
    where: { pricingTierId_productId: { pricingTierId, productId } },
    update: { price },
    create: { pricingTierId, productId, price },
  });
}

export async function removeTierProductPrice(pricingTierId: string, productId: string) {
  await prisma.pricingTierProduct.deleteMany({ where: { pricingTierId, productId } });
}
