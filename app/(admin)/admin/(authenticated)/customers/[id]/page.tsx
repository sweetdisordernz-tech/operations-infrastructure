import { notFound } from "next/navigation";
import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { prisma } from "@/lib/db";
import { getPricingTiers } from "@/lib/admin/pricing-tiers";
import { CustomerForm } from "@/app/_components/admin/customer-form";
import { DeleteButton } from "@/app/_components/admin/delete-button";
import { updateCustomerAction, deleteCustomerAction } from "@/app/(admin)/admin/(authenticated)/customers/actions";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPageUser();
  const { id } = await params;

  const [customer, pricingTiers] = await Promise.all([
    prisma.wholesaleCustomer.findUnique({ where: { id } }),
    getPricingTiers(),
  ]);
  if (!customer) notFound();

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">{customer.companyName}</h1>
          <p>{customer.email}</p>
        </div>
      </div>

      <div className="sd-panel">
        <CustomerForm action={updateCustomerAction} pricingTiers={pricingTiers} customer={customer} />
      </div>

      <div className="sd-panel">
        <h2 className="sd-section-heading" style={{ marginBottom: "0.75rem" }}>
          Danger zone
        </h2>
        <p className="sd-caption" style={{ marginBottom: "0.75rem" }}>
          Deleting only works if this customer has no order history.
        </p>
        <DeleteButton
          action={deleteCustomerAction}
          hiddenFields={{ id: customer.id }}
          label="Delete customer"
          confirmMessage={`Delete "${customer.companyName}"? This can't be undone.`}
        />
      </div>
    </>
  );
}
