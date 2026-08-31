"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useCart } from "@/app/_components/cart-context";
import { formatPackagingType } from "@/lib/format";
import type { ReorderSuggestion } from "@/lib/wholesale/reorder";

export function ReorderShortcuts({ suggestions }: { suggestions: ReorderSuggestion[] }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState<Set<string>>(new Set());

  if (suggestions.length === 0) {
    return (
      <div className="sd-home-section">
        <h2>Reorder your usuals</h2>
        <div className="sd-reorder-empty">
          <Check aria-hidden="true" size={22} />
          <p>
            Once you&apos;ve placed a couple of orders here, your regulars will show up in this
            spot for a one-tap reorder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-home-section">
      <h2>Reorder your usuals</h2>
      <div className="sd-reorder-row">
        {suggestions.map((item) => {
          const isAdded = added.has(item.productId);
          return (
            <div key={item.productId} className="sd-reorder-card">
              <p className="sd-product-name">
                {item.productName} — {formatPackagingType(item.packagingType)}
              </p>
              <p className="sd-reorder-meta">
                usually {item.avgQuantity} every ~{item.avgIntervalDays}d
                {item.dueNow ? " — you're due" : ""}
              </p>
              <button
                type="button"
                className="sd-add-btn"
                disabled={isAdded}
                onClick={() => {
                  addItem(item.productId, item.avgQuantity);
                  setAdded((prev) => new Set(prev).add(item.productId));
                }}
              >
                {isAdded ? (
                  <>
                    <Check size={16} aria-hidden="true" /> Added
                  </>
                ) : (
                  `+ Add ${item.avgQuantity}`
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
