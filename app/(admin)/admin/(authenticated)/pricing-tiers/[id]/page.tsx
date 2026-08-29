import { notFound } from "next/navigation";
import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { getPricingTier } from "@/lib/admin/pricing-tiers";
import { getProducts } from "@/lib/admin/products";
import { PricingTierForm } from "@/app/_components/admin/pricing-tier-form";
import { DeleteButton } from "@/app/_components/admin/delete-button";
import { TierPricingTable } from "@/app/_components/admin/tier-pricing-table";
import {
  updatePricingTierAction,
  deletePricingTierAction,
} from "@/app/(admin)/admin/(authenticated)/pricing-tiers/actions";

export default async function EditPricingTierPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPageUser();
  const { id } = await params;

  const [tier, allProducts] = await Promise.all([getPricingTier(id), getProducts()]);
  if (!tier) notFound();

  const pricedProductIds = new Set(tier.products.map((p) => p.productId));
  const priced = tier.products.map((p) => ({
    productId: p.productId,
    productName: p.product.name,
    sku: p.product.sku,
    price: Number(p.price),
  }));
  const unpriced = allProducts
    .filter((p) => !pricedProductIds.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, sku: p.sku }));

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">{tier.name}</h1>
          <p>{tier.region}</p>
        </div>
      </div>

      <div className="sd-panel">
        <PricingTierForm action={updatePricingTierAction} tier={{ id: tier.id, name: tier.name, region: tier.region }} />
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Product pricing</h2>
          <span className="sd-stat-number">{priced.length}</span>
        </div>
        <TierPricingTable pricingTierId={tier.id} priced={priced} unpriced={unpriced} />
      </div>

      <div className="sd-panel">
        <h2 className="sd-section-heading" style={{ marginBottom: "0.75rem" }}>
          Danger zone
        </h2>
        <DeleteButton
          action={deletePricingTierAction}
          hiddenFields={{ id: tier.id }}
          label="Delete pricing tier"
          confirmMessage={`Delete "${tier.name}"? This removes all its product pricing too.`}
        />
      </div>
    </>
  );
}
