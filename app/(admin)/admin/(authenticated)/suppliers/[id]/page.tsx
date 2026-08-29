import { notFound } from "next/navigation";
import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { prisma } from "@/lib/db";
import { SupplierForm } from "@/app/_components/admin/supplier-form";
import { DeleteButton } from "@/app/_components/admin/delete-button";
import { updateSupplierAction, deleteSupplierAction } from "@/app/(admin)/admin/(authenticated)/suppliers/actions";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPageUser();
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">{supplier.name}</h1>
        </div>
      </div>

      <div className="sd-panel">
        <SupplierForm action={updateSupplierAction} supplier={supplier} />
      </div>

      <div className="sd-panel">
        <h2 className="sd-section-heading" style={{ marginBottom: "0.75rem" }}>
          Danger zone
        </h2>
        <DeleteButton
          action={deleteSupplierAction}
          hiddenFields={{ id: supplier.id }}
          label="Delete supplier"
          confirmMessage={`Delete "${supplier.name}"? This can't be undone.`}
        />
      </div>
    </>
  );
}
