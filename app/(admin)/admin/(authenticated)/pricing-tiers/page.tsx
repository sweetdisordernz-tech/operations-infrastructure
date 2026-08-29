import Link from "next/link";
import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { getPricingTiers } from "@/lib/admin/pricing-tiers";
import { PricingTierForm } from "@/app/_components/admin/pricing-tier-form";
import { createPricingTierAction } from "@/app/(admin)/admin/(authenticated)/pricing-tiers/actions";

export default async function PricingTiersPage() {
  await requireAdminPageUser();
  const tiers = await getPricingTiers();

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Pricing Tiers</h1>
          <p>Per-region wholesale pricing tiers and their per-SKU price overrides.</p>
        </div>
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Add pricing tier</h2>
        </div>
        <PricingTierForm action={createPricingTierAction} />
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">All pricing tiers</h2>
          <span className="sd-stat-number">{tiers.length}</span>
        </div>
        {tiers.length === 0 ? (
          <p className="sd-empty-state">No pricing tiers yet.</p>
        ) : (
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Region</th>
                  <th>Customers</th>
                  <th>Priced products</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => (
                  <tr key={tier.id}>
                    <td className="sd-table-name">{tier.name}</td>
                    <td>{tier.region}</td>
                    <td>{tier._count.wholesaleCustomers}</td>
                    <td>{tier._count.products}</td>
                    <td>
                      <Link href={`/pricing-tiers/${tier.id}`} className="sd-btn sd-btn-sm">
                        Manage
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
