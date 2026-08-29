import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { getRanges, getFillings } from "@/lib/admin/products";
import { getInventoryOverview } from "@/lib/admin/inventory";
import { getProductsNeedingReorder } from "@/lib/inventory/reorder";
import { ProductForm } from "@/app/_components/admin/product-form";
import { SimpleStockTable } from "@/app/_components/ops/simple-stock-table";
import { createProductAction } from "@/app/(ops)/dashboard/(authenticated)/inventory/actions";

export default async function OpsInventoryPage() {
  await requireAdminPageUser();

  const [ranges, fillings, inventory, productReorders] = await Promise.all([
    getRanges(),
    getFillings(),
    getInventoryOverview(),
    getProductsNeedingReorder(),
  ]);
  const reorderProductIds = new Set(productReorders.map((r) => r.productId));

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Inventory & Products</h1>
          <p>Add a new product, or check finished-good stock levels.</p>
        </div>
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Add product</h2>
        </div>
        <p className="sd-caption" style={{ marginBottom: "1rem" }}>
          SKU/barcode are optional. Toggle &quot;Show in wholesale portal&quot; once it&apos;s ready to sell -
          it appears there automatically, no separate publish step.
        </p>
        <ProductForm action={createProductAction} ranges={ranges} fillings={fillings} />
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Stock levels</h2>
          <div className="sd-stat">
            <span className="sd-stat-number">{productReorders.length}</span>
            <span className="sd-stat-label">Low stock</span>
          </div>
        </div>
        {inventory.length === 0 ? (
          <p className="sd-empty-state">No products yet.</p>
        ) : (
          <SimpleStockTable rows={inventory} reorderProductIds={reorderProductIds} />
        )}
      </div>
    </>
  );
}
