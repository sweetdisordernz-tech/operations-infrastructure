"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";
import { adjustStockAction } from "@/app/(ops)/dashboard/(authenticated)/inventory/actions";
import type { InventoryOverviewRow } from "@/lib/admin/inventory";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="sd-btn sd-btn-primary sd-btn-sm" disabled={pending}>
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

function StockRow({ row, needsReorder }: { row: InventoryOverviewRow; needsReorder: boolean }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(adjustStockAction, INITIAL_ACTION_RESULT);
  const [quantity, setQuantity] = useState(String(row.quantityOnHand));

  return (
    <tr>
      <td>
        <div className="sd-table-name">{row.name}</div>
        <div className="sd-table-sub">{row.sku ?? "No SKU yet"} - {row.rangeName}</div>
      </td>
      <td>{needsReorder && <span className="sd-badge sd-badge-warning">Low stock</span>}</td>
      <td>
        <form action={formAction} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <input type="hidden" name="inventoryItemId" value={row.inventoryItemId} />
          <input
            type="number"
            name="newQuantity"
            min={0}
            className="sd-inline-field"
            style={{ width: "5rem" }}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <SaveButton />
        </form>
        {!state.ok && <p className="sd-action-error" style={{ marginTop: "0.35rem" }}>{state.error}</p>}
      </td>
    </tr>
  );
}

export function SimpleStockTable({
  rows,
  reorderProductIds,
}: {
  rows: InventoryOverviewRow[];
  reorderProductIds: Set<string>;
}) {
  return (
    <div className="sd-table-wrap">
      <table className="sd-table">
        <thead>
          <tr>
            <th>Product</th>
            <th></th>
            <th>Stock on hand</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <StockRow key={row.inventoryItemId} row={row} needsReorder={reorderProductIds.has(row.productId)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
