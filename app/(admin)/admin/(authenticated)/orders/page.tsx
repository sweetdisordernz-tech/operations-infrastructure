import { Suspense } from "react";
import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { OrdersOverview } from "@/app/_components/admin/orders-overview";

export default async function OrdersPage() {
  await requireAdminPageUser();

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Order Overview</h1>
          <p>All orders across Shopify and the wholesale portal, filterable by status/region/source.</p>
        </div>
      </div>

      <Suspense fallback={<p className="sd-empty-state">Loading orders...</p>}>
        <OrdersOverview />
      </Suspense>
    </>
  );
}
