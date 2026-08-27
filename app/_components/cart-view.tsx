"use client";

import { useActionState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useCart } from "@/app/_components/cart-context";
import { formatPackagingType } from "@/lib/format";
import type { WholesaleCatalog } from "@/lib/wholesale/catalog";
import type { Region } from "@prisma/client";
import { placeOrderAction, type CheckoutResult } from "@/app/(wholesale)/portal/(authenticated)/cart/actions";

export function CartView({
  catalog,
  shipsToBothRegions,
}: {
  catalog: WholesaleCatalog;
  shipsToBothRegions: boolean;
}) {
  const { items, updateQuantity, removeItem, setItemRegion, clear } = useCart();
  const router = useRouter();
  const [state, formAction] = useActionState<CheckoutResult, FormData>(placeOrderAction, {
    status: "idle",
  });

  const catalogByProductId = useMemo(
    () => new Map(catalog.products.map((product) => [product.productId, product])),
    [catalog],
  );

  const resolved = items.map((item) => ({ item, product: catalogByProductId.get(item.productId) }));
  const validLines = resolved.filter(
    (line): line is { item: (typeof items)[number]; product: NonNullable<typeof line.product> } =>
      Boolean(line.product),
  );
  const staleLines = resolved.filter((line) => !line.product);
  const total = validLines.reduce((sum, line) => sum + line.product.price * line.item.quantity, 0);

  useEffect(() => {
    if (state.status === "success") {
      clear();
      router.push("/orders");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (items.length === 0) {
    return <p className="sd-note">Your cart is empty. Head to the catalog to add something.</p>;
  }

  const itemsPayload = JSON.stringify(
    validLines.map((line) => ({
      productId: line.item.productId,
      quantity: line.item.quantity,
      region: line.item.region,
    })),
  );

  return (
    <div>
      <div className="sd-product-list">
        {validLines.map(({ item, product }) => (
          <div key={`${item.productId}:${item.region}`} className="sd-cart-line">
            <div className="sd-cart-line-top">
              <div>
                <p className="sd-product-name">{product.name}</p>
                <p className="sd-product-meta">
                  {formatPackagingType(product.packagingType)}
                  {product.fillingName ? ` — ${product.fillingName}` : ""}
                </p>
              </div>
              <span className="sd-product-price">${(product.price * item.quantity).toFixed(2)}</span>
            </div>
            <div className="sd-cart-line-actions">
              <div className="sd-qty-stepper">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={item.quantity <= product.minOrderQty}
                  onClick={() => updateQuantity(item.productId, item.region, item.quantity - 1)}
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => updateQuantity(item.productId, item.region, item.quantity + 1)}
                >
                  +
                </button>
              </div>
              {shipsToBothRegions && (
                <RegionToggle
                  region={item.region}
                  onChange={(next) => setItemRegion(item.productId, item.region, next)}
                />
              )}
              <button
                type="button"
                className="sd-remove-link"
                onClick={() => removeItem(item.productId, item.region)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {staleLines.length > 0 && (
        <p className="sd-action-error">
          {staleLines.length === 1 ? "One item is" : `${staleLines.length} items are`} no longer available
          and won&apos;t be included in this order.
        </p>
      )}

      <div className="sd-checkout-summary">
        <div className="sd-checkout-summary-row total">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <p className="sd-note" style={{ marginTop: "0.5rem" }}>
          You&apos;ll be invoiced separately - no payment is taken here.
        </p>
      </div>

      <form action={formAction}>
        <input type="hidden" name="items" value={itemsPayload} />
        <CheckoutButton disabled={validLines.length === 0} />
        {state.status === "error" && <p className="sd-action-error">{state.error}</p>}
      </form>
    </div>
  );
}

function RegionToggle({ region, onChange }: { region: Region; onChange: (region: Region) => void }) {
  return (
    <div className="sd-region-toggle">
      <button type="button" className={region === "NZ" ? "active" : undefined} onClick={() => onChange("NZ")}>
        NZ
      </button>
      <button type="button" className={region === "AU" ? "active" : undefined} onClick={() => onChange("AU")}>
        AU
      </button>
    </div>
  );
}

function CheckoutButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="sd-big-button" disabled={disabled || pending}>
      {pending ? "Placing order..." : "Place order"}
    </button>
  );
}
