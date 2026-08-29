import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { getFillingRollup } from "@/lib/admin/filling";
import { getProductsNeedingReorder, getFillingsNeedingReorder } from "@/lib/inventory/reorder";

export default async function OpsFillingPage() {
  await requireAdminPageUser();

  const [fillingRollup, productReorders, fillingReorders] = await Promise.all([
    getFillingRollup(),
    getProductsNeedingReorder(),
    getFillingsNeedingReorder(),
  ]);
  const reorderFillingIds = new Set(fillingReorders.map((r) => r.fillingId));

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Filling & Reorder</h1>
          <p>Do you need to buy more of anything this week?</p>
        </div>
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Reorder now</h2>
        </div>
        {productReorders.length === 0 && fillingReorders.length === 0 ? (
          <p className="sd-empty-state">Nothing needs reordering right now.</p>
        ) : (
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>On hand</th>
                  <th>Recommended reorder</th>
                </tr>
              </thead>
              <tbody>
                {productReorders.map((r) => (
                  <tr key={`product-${r.productId}`}>
                    <td className="sd-table-name">{r.name}</td>
                    <td>Product</td>
                    <td>{r.quantityOnHand}</td>
                    <td>{r.recommendedReorderQty ?? "-"}</td>
                  </tr>
                ))}
                {fillingReorders.map((r) => (
                  <tr key={`filling-${r.fillingId}`}>
                    <td className="sd-table-name">{r.name}</td>
                    <td>Filling</td>
                    <td>{r.quantityOnHand}</td>
                    <td>-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Filling rollup</h2>
        </div>
        <p className="sd-caption" style={{ marginBottom: "0.75rem" }}>
          Units queued = quantity across every line item on an order that hasn&apos;t dispatched yet.
        </p>
        <div className="sd-table-wrap">
          <table className="sd-table">
            <thead>
              <tr>
                <th>Filling</th>
                <th>Units queued</th>
                <th>Stock on hand</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fillingRollup.map((row) => (
                <tr key={row.fillingId}>
                  <td className="sd-table-name">{row.name}</td>
                  <td>{row.unitsQueued}</td>
                  <td>{row.quantityOnHand ?? "-"}</td>
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
