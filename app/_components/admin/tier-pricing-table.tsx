"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";
import {
  setTierProductPriceAction,
  removeTierProductPriceAction,
} from "@/app/(admin)/admin/(authenticated)/pricing-tiers/actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="sd-btn sd-btn-primary sd-btn-sm" disabled={pending}>
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="sd-btn sd-btn-danger sd-btn-sm" disabled={pending}>
      {pending ? "Removing..." : "Remove"}
    </button>
  );
}

function PriceRow({
  pricingTierId,
  productId,
  productName,
  sku,
  price,
}: {
  pricingTierId: string;
  productId: string;
  productName: string;
  sku: string | null;
  price: number;
}) {
  const [setState, setPriceFormAction] = useActionState<ActionResult, FormData>(setTierProductPriceAction, INITIAL_ACTION_RESULT);
  const [removeState, removeFormAction] = useActionState<ActionResult, FormData>(removeTierProductPriceAction, INITIAL_ACTION_RESULT);

  return (
    <tr>
      <td>
        <div className="sd-table-name">{productName}</div>
        <div className="sd-table-sub">{sku ?? "No SKU yet"}</div>
      </td>
      <td>
        <form action={setPriceFormAction} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <input type="hidden" name="pricingTierId" value={pricingTierId} />
          <input type="hidden" name="productId" value={productId} />
          <input type="number" name="price" min={0} step="0.01" defaultValue={price} className="sd-inline-field" style={{ width: "6rem" }} />
          <SaveButton />
        </form>
        {!setState.ok && <p className="sd-action-error" style={{ marginTop: "0.35rem" }}>{setState.error}</p>}
      </td>
      <td>
        <form action={removeFormAction}>
          <input type="hidden" name="pricingTierId" value={pricingTierId} />
          <input type="hidden" name="productId" value={productId} />
          <RemoveButton />
        </form>
        {!removeState.ok && <p className="sd-action-error">{removeState.error}</p>}
      </td>
    </tr>
  );
}

function AddPriceRow({ pricingTierId, unpriced }: { pricingTierId: string; unpriced: Array<{ id: string; name: string; sku: string | null }> }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(setTierProductPriceAction, INITIAL_ACTION_RESULT);

  if (unpriced.length === 0) return null;

  return (
    <form action={formAction} className="sd-toolbar" style={{ marginTop: "1rem" }}>
      <input type="hidden" name="pricingTierId" value={pricingTierId} />
      <select name="productId" defaultValue="" required>
        <option value="" disabled>
          Add a price for...
        </option>
        {unpriced.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name} ({product.sku ?? "no SKU"})
          </option>
        ))}
      </select>
      <input type="number" name="price" min={0} step="0.01" placeholder="Price" required style={{ width: "6rem" }} />
      <SaveButton />
      {!state.ok && <p className="sd-action-error">{state.error}</p>}
    </form>
  );
}

export function TierPricingTable({
  pricingTierId,
  priced,
  unpriced,
}: {
  pricingTierId: string;
  priced: Array<{ productId: string; productName: string; sku: string | null; price: number }>;
  unpriced: Array<{ id: string; name: string; sku: string | null }>;
}) {
  return (
    <>
      {priced.length === 0 ? (
        <p className="sd-empty-state">No products priced for this tier yet.</p>
      ) : (
        <div className="sd-table-wrap">
          <table className="sd-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {priced.map((row) => (
                <PriceRow
                  key={row.productId}
                  pricingTierId={pricingTierId}
                  productId={row.productId}
                  productName={row.productName}
                  sku={row.sku}
                  price={row.price}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AddPriceRow pricingTierId={pricingTierId} unpriced={unpriced} />
    </>
  );
}
