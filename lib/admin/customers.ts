import { prisma } from "@/lib/db";
import { AdminValidationError } from "@/lib/admin/errors";
import type { Region } from "@prisma/client";

export type CustomerInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  region: Region;
  shipsToBothRegions: boolean;
  pricingTierId: string | null;
};

function validate(input: CustomerInput) {
  if (!input.companyName.trim()) throw new AdminValidationError("Company name is required.");
  if (!input.contactName.trim()) throw new AdminValidationError("Contact name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    throw new AdminValidationError("Enter a valid email address.");
  }
}

export async function getCustomers() {
  return prisma.wholesaleCustomer.findMany({
    orderBy: { companyName: "asc" },
    include: { pricingTier: true, _count: { select: { orders: true } } },
  });
}

export async function createCustomer(input: CustomerInput) {
  validate(input);
  const existing = await prisma.wholesaleCustomer.findUnique({ where: { email: input.email.trim() } });
  if (existing) throw new AdminValidationError(`A customer with email "${input.email}" already exists.`);

  return prisma.wholesaleCustomer.create({
    data: {
      companyName: input.companyName.trim(),
      contactName: input.contactName.trim(),
      email: input.email.trim(),
      phone: input.phone,
      region: input.region,
      shipsToBothRegions: input.shipsToBothRegions,
      pricingTierId: input.pricingTierId,
    },
  });
}

export async function updateCustomer(id: string, input: CustomerInput) {
  validate(input);
  const existing = await prisma.wholesaleCustomer.findUnique({ where: { id } });
  if (!existing) throw new AdminValidationError("That customer no longer exists.");

  const emailOwner = await prisma.wholesaleCustomer.findUnique({ where: { email: input.email.trim() } });
  if (emailOwner && emailOwner.id !== id) {
    throw new AdminValidationError(`A customer with email "${input.email}" already exists.`);
  }

  await prisma.wholesaleCustomer.update({
    where: { id },
    data: {
      companyName: input.companyName.trim(),
      contactName: input.contactName.trim(),
      email: input.email.trim(),
      phone: input.phone,
      region: input.region,
      shipsToBothRegions: input.shipsToBothRegions,
      pricingTierId: input.pricingTierId,
    },
  });
}

export async function deleteCustomer(id: string) {
  const orderCount = await prisma.order.count({ where: { wholesaleCustomerId: id } });
  if (orderCount > 0) {
    throw new AdminValidationError("This customer has order history and can't be deleted.");
  }
  await prisma.$transaction([
    prisma.magicLinkToken.deleteMany({ where: { wholesaleCustomerId: id } }),
    prisma.wholesaleCustomer.delete({ where: { id } }),
  ]);
}
