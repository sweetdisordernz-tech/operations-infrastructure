import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { OpsOrdersOverview } from "@/app/_components/ops/orders-overview";

export default async function OpsOrdersPage() {
  await requireAdminPageUser();

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Orders</h1>
          <p>What&apos;s waiting on action today, across Shopify and the wholesale portal.</p>
        </div>
      </div>

      <div className="sd-panel">
        <OpsOrdersOverview />
      </div>
    </>
  );
}
