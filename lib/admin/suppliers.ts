import { prisma } from "@/lib/db";
import { AdminValidationError } from "@/lib/admin/errors";

export type SupplierInput = {
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  leadTimeDays: number | null;
  notes: string | null;
};

function validate(input: SupplierInput) {
  if (!input.name.trim()) throw new AdminValidationError("Supplier name is required.");
  if (input.leadTimeDays !== null && (!Number.isInteger(input.leadTimeDays) || input.leadTimeDays < 0)) {
    throw new AdminValidationError("Lead time must be a whole number of days, or left blank.");
  }
}

export async function getSuppliers() {
  return prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { fillings: true, inventoryItems: true } } },
  });
}

export async function createSupplier(input: SupplierInput) {
  validate(input);
  return prisma.supplier.create({
    data: {
      name: input.name.trim(),
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      leadTimeDays: input.leadTimeDays,
      notes: input.notes,
    },
  });
}

export async function updateSupplier(id: string, input: SupplierInput) {
  validate(input);
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) throw new AdminValidationError("That supplier no longer exists.");

  await prisma.supplier.update({
    where: { id },
    data: {
      name: input.name.trim(),
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      leadTimeDays: input.leadTimeDays,
      notes: input.notes,
    },
  });
}

export async function deleteSupplier(id: string) {
  const [fillingCount, inventoryCount] = await Promise.all([
    prisma.filling.count({ where: { supplierId: id } }),
    prisma.inventoryItem.count({ where: { supplierId: id } }),
  ]);
  if (fillingCount > 0 || inventoryCount > 0) {
    throw new AdminValidationError(
      "This supplier is linked to fillings or inventory items - unlink those first.",
    );
  }
  await prisma.supplier.delete({ where: { id } });
}
