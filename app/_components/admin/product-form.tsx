"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";
import type { ProductRow } from "@/lib/admin/products";

const NEW_SENTINEL = "__new__";

type RangeOption = { id: string; name: string };
type FillingOption = { id: string; name: string };

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="sd-btn sd-btn-primary" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function ProductForm({
  action,
  ranges,
  fillings,
  product,
}: {
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  ranges: RangeOption[];
  fillings: FillingOption[];
  product?: ProductRow;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, INITIAL_ACTION_RESULT);
  const [rangeChoice, setRangeChoice] = useState(product?.rangeId ?? ranges[0]?.id ?? "");
  const [fillingChoice, setFillingChoice] = useState(product?.fillingId ?? "");

  return (
    <form action={formAction} className="sd-crud-form">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="sd-crud-grid">
        <div className="sd-field">
          <label htmlFor="name">Product name</label>
          <input id="name" type="text" name="name" defaultValue={product?.name} required />
        </div>

        <div className="sd-field">
          <label htmlFor="rangeId">Range</label>
          <select id="rangeId" name="rangeId" value={rangeChoice} onChange={(e) => setRangeChoice(e.target.value)}>
            {ranges.map((range) => (
              <option key={range.id} value={range.id}>
                {range.name}
              </option>
            ))}
            <option value={NEW_SENTINEL}>+ Add new range...</option>
          </select>
        </div>

        {rangeChoice === NEW_SENTINEL && (
          <>
            <div className="sd-field">
              <label htmlFor="newRangeName">New range name</label>
              <input id="newRangeName" type="text" name="newRangeName" required />
            </div>
            <div className="sd-field">
              <label htmlFor="newRangeSkuPrefix">New range SKU prefix</label>
              <input id="newRangeSkuPrefix" type="text" name="newRangeSkuPrefix" placeholder="e.g. SDX" required />
            </div>
          </>
        )}

        <div className="sd-field">
          <label htmlFor="packagingType">Packaging type</label>
          <select id="packagingType" name="packagingType" defaultValue={product?.packagingType ?? "BOTTLE"}>
            <option value="BOTTLE">Bottle</option>
            <option value="JAR">Jar</option>
            <option value="TIN">Tin</option>
            <option value="STAND">Stand</option>
          </select>
        </div>

        <div className="sd-field">
          <label htmlFor="fillingId">Filling</label>
          <select id="fillingId" name="fillingId" value={fillingChoice} onChange={(e) => setFillingChoice(e.target.value)}>
            <option value="">No filling</option>
            {fillings.map((filling) => (
              <option key={filling.id} value={filling.id}>
                {filling.name}
              </option>
            ))}
            <option value={NEW_SENTINEL}>+ Add new filling...</option>
          </select>
        </div>

        {fillingChoice === NEW_SENTINEL && (
          <div className="sd-field">
            <label htmlFor="newFillingName">New filling name</label>
            <input id="newFillingName" type="text" name="newFillingName" required />
          </div>
        )}

        <div className="sd-field">
          <label htmlFor="sku">SKU</label>
          <input id="sku" type="text" name="sku" defaultValue={product?.sku ?? ""} placeholder="Optional - can be assigned later" />
        </div>

        <div className="sd-field">
          <label htmlFor="barcode">Barcode</label>
          <input id="barcode" type="text" name="barcode" defaultValue={product?.barcode ?? ""} placeholder="Optional" />
        </div>

        <div className="sd-field">
          <label htmlFor="minOrderQty">Min order quantity</label>
          <input id="minOrderQty" type="number" name="minOrderQty" min={1} defaultValue={product?.minOrderQty ?? 1} required />
        </div>

        <div className="sd-field">
          <label htmlFor="imageBlobUrl">Image URL</label>
          <input id="imageBlobUrl" type="text" name="imageBlobUrl" defaultValue={product?.imageBlobUrl ?? ""} placeholder="Optional" />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <label className="sd-checkbox-field">
          <input type="checkbox" name="wholesaleVisible" defaultChecked={product?.wholesaleVisible ?? false} />
          Show in wholesale portal
        </label>
        <label className="sd-checkbox-field">
          <input type="checkbox" name="active" defaultChecked={product?.active ?? true} />
          Active
        </label>
        <label className="sd-checkbox-field">
          <input type="checkbox" name="discontinued" defaultChecked={product?.discontinued ?? false} />
          Discontinued
        </label>
      </div>

      <div className="sd-form-actions">
        <SubmitButton label={product ? "Save changes" : "Create product"} pendingLabel={product ? "Saving..." : "Creating..."} />
        {!state.ok && <p className="sd-action-error" style={{ margin: 0 }}>{state.error}</p>}
      </div>
    </form>
  );
}
