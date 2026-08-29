import Link from "next/link";
import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { getSuppliers } from "@/lib/admin/suppliers";
import { SupplierForm } from "@/app/_components/admin/supplier-form";
import { createSupplierAction } from "@/app/(admin)/admin/(authenticated)/suppliers/actions";

export default async function SuppliersPage() {
  await requireAdminPageUser();
  const suppliers = await getSuppliers();

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Suppliers</h1>
          <p>Bulk filling/lolly suppliers and their lead times.</p>
        </div>
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Add supplier</h2>
        </div>
        <SupplierForm action={createSupplierAction} />
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">All suppliers</h2>
          <span className="sd-stat-number">{suppliers.length}</span>
        </div>
        {suppliers.length === 0 ? (
          <p className="sd-empty-state">No suppliers yet.</p>
        ) : (
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Lead time</th>
                  <th>In use</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="sd-table-name">{supplier.name}</td>
                    <td className="sd-table-sub">
                      {supplier.contactEmail ?? "-"}
                      {supplier.contactPhone ? ` - ${supplier.contactPhone}` : ""}
                    </td>
                    <td>{supplier.leadTimeDays ? `${supplier.leadTimeDays} days` : "-"}</td>
                    <td>{supplier._count.fillings + supplier._count.inventoryItems} links</td>
                    <td>
                      <Link href={`/suppliers/${supplier.id}`} className="sd-btn sd-btn-sm">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
