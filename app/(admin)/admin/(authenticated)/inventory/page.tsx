import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { getInventoryOverview } from "@/lib/admin/inventory";
import { getFillingRollup } from "@/lib/admin/filling";
import { getProductsNeedingReorder, getFillingsNeedingReorder } from "@/lib/inventory/reorder";
import { InventoryTable } from "@/app/_components/admin/inventory-table";

export default async function InventoryPage() {
  await requireAdminPageUser();

  const [inventory, fillingRollup, productReorders, fillingReorders] = await Promise.all([
    getInventoryOverview(),
    getFillingRollup(),
    getProductsNeedingReorder(),
    getFillingsNeedingReorder(),
  ]);

  const reorderProductIds = new Set(productReorders.map((r) => r.productId));
  const reorderFillingIds = new Set(fillingReorders.map((r) => r.fillingId));

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Inventory & Filling</h1>
          <p>Finished-good stock, manual adjustments, and the filling rollup across every SKU that shares it.</p>
        </div>
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Product stock</h2>
          <div className="sd-stat-row">
            <div className="sd-stat">
              <span className="sd-stat-number">{productReorders.length}</span>
              <span className="sd-stat-label">Need reorder</span>
            </div>
            <div className="sd-stat">
              <span className="sd-stat-number">{inventory.length}</span>
              <span className="sd-stat-label">Products tracked</span>
            </div>
          </div>
        </div>
        {inventory.length === 0 ? (
          <p className="sd-empty-state">No inventory items yet.</p>
        ) : (
          <InventoryTable rows={inventory} reorderProductIds={reorderProductIds} />
        )}
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Filling rollup</h2>
          <div className="sd-stat-row">
            <div className="sd-stat">
              <span className="sd-stat-number">{fillingReorders.length}</span>
              <span className="sd-stat-label">Need reorder</span>
            </div>
          </div>
        </div>
        <p className="sd-caption" style={{ marginBottom: "0.75rem" }}>
          Units queued = quantity across every line item on an order that hasn&apos;t dispatched yet.
        </p>
        <div className="sd-table-wrap">
          <table className="sd-table">
            <thead>
              <tr>
                <th>Filling</th>
                <th>SKUs using it</th>
                <th>Units queued (open orders)</th>
                <th>Stock on hand</th>
                <th>Reorder threshold</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fillingRollup.map((row) => (
                <tr key={row.fillingId}>
                  <td className="sd-table-name">{row.name}</td>
                  <td>{row.skuCount}</td>
                  <td>{row.unitsQueued}</td>
                  <td>{row.quantityOnHand ?? "-"}</td>
                  <td>{row.reorderThreshold ?? "-"}</td>
                  <td>{reorderFillingIds.has(row.fillingId) && <span className="sd-badge sd-badge-warning">Reorder</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
