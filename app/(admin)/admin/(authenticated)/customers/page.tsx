import Link from "next/link";
import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { getCustomers } from "@/lib/admin/customers";
import { getPricingTiers } from "@/lib/admin/pricing-tiers";
import { CustomerForm } from "@/app/_components/admin/customer-form";
import { createCustomerAction } from "@/app/(admin)/admin/(authenticated)/customers/actions";

export default async function CustomersPage() {
  await requireAdminPageUser();
  const [customers, pricingTiers] = await Promise.all([getCustomers(), getPricingTiers()]);

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Wholesale Customers</h1>
          <p>Customer accounts, region, and pricing tier assignment.</p>
        </div>
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Add customer</h2>
        </div>
        <CustomerForm action={createCustomerAction} pricingTiers={pricingTiers} />
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">All customers</h2>
          <span className="sd-stat-number">{customers.length}</span>
        </div>
        {customers.length === 0 ? (
          <p className="sd-empty-state">No wholesale customers yet.</p>
        ) : (
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Region</th>
                  <th>Pricing tier</th>
                  <th>Orders</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="sd-table-name">{customer.companyName}</td>
                    <td className="sd-table-sub">
                      {customer.contactName} - {customer.email}
                    </td>
                    <td>
                      {customer.region}
                      {customer.shipsToBothRegions ? " (+AU/NZ split)" : ""}
                    </td>
                    <td>{customer.pricingTier?.name ?? "-"}</td>
                    <td>{customer._count.orders}</td>
                    <td>
                      <Link href={`/customers/${customer.id}`} className="sd-btn sd-btn-sm">
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
