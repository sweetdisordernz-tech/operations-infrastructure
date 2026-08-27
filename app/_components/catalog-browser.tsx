"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/app/_components/cart-context";
import { formatPackagingType } from "@/lib/format";
import type { WholesaleCatalog } from "@/lib/wholesale/catalog";

const ALL = "__all__";

export function CatalogBrowser({ catalog }: { catalog: WholesaleCatalog }) {
  const [rangeFilter, setRangeFilter] = useState(ALL);
  const [fillingFilter, setFillingFilter] = useState(ALL);

  const filtered = useMemo(
    () =>
      catalog.products.filter(
        (product) =>
          (rangeFilter === ALL || product.rangeId === rangeFilter) &&
          (fillingFilter === ALL || product.fillingId === fillingFilter),
      ),
    [catalog.products, rangeFilter, fillingFilter],
  );

  if (catalog.products.length === 0) {
    return (
      <p className="sd-note">
        Nothing available to order yet - check back soon, or contact Sweet Disorder if you think that&apos;s
        wrong.
      </p>
    );
  }

  return (
    <div>
      <div className="sd-filter-row" aria-label="Filter by range">
        <button
          type="button"
          className={`sd-filter-chip${rangeFilter === ALL ? " active" : ""}`}
          onClick={() => setRangeFilter(ALL)}
        >
          All ranges
        </button>
        {catalog.ranges.map((range) => (
          <button
            key={range.id}
            type="button"
            className={`sd-filter-chip${rangeFilter === range.id ? " active" : ""}`}
            onClick={() => setRangeFilter(range.id)}
          >
            {range.name}
          </button>
        ))}
      </div>

      {catalog.fillings.length > 0 && (
        <div className="sd-filter-row" aria-label="Filter by filling">
          <button
            type="button"
            className={`sd-filter-chip${fillingFilter === ALL ? " active" : ""}`}
            onClick={() => setFillingFilter(ALL)}
          >
            All fillings
          </button>
          {catalog.fillings.map((filling) => (
            <button
              key={filling.id}
              type="button"
              className={`sd-filter-chip${fillingFilter === filling.id ? " active" : ""}`}
              onClick={() => setFillingFilter(filling.id)}
            >
              {filling.name}
            </button>
          ))}
        </div>
      )}

      <div className="sd-product-list">
        {filtered.map((product) => (
          <ProductCard key={product.productId} product={product} />
        ))}
        {filtered.length === 0 && <p className="sd-note">No products match those filters.</p>}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: WholesaleCatalog["products"][number] }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(product.minOrderQty);
  const [added, setAdded] = useState(false);

  return (
    <div className="sd-product-card">
      <p className="sd-product-name">{product.name}</p>
      <p className="sd-product-meta">
        {formatPackagingType(product.packagingType)}
        {product.fillingName ? ` — ${product.fillingName}` : ""}
        {product.minOrderQty > 1 ? ` — min order ${product.minOrderQty}` : ""}
      </p>
      <div className="sd-product-row">
        <span className="sd-product-price">${product.price.toFixed(2)}</span>
        <div className="sd-qty-stepper">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={quantity <= product.minOrderQty}
            onClick={() => setQuantity((q) => Math.max(product.minOrderQty, q - 1))}
          >
            −
          </button>
          <span>{quantity}</span>
          <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((q) => q + 1)}>
            +
          </button>
        </div>
        <button
          type="button"
          className="sd-add-btn"
          onClick={() => {
            addItem(product.productId, quantity);
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
          }}
        >
          {added ? "Added ✓" : "Add"}
        </button>
      </div>
    </div>
  );
}
