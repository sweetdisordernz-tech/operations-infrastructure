"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Check, Candy } from "lucide-react";
import { useCart } from "@/app/_components/cart-context";
import { formatPackagingType } from "@/lib/format";
import type { WholesaleCatalog } from "@/lib/wholesale/catalog";

const ALL = "__all__";

type SortOption = "popular" | "az" | "price_desc" | "price_asc";

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "popular", label: "Most Popular" },
  { value: "az", label: "A–Z" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "price_asc", label: "Price: Low to High" },
];

/**
 * "Most Popular" sorts by Product.salesRank (lower = more popular). A
 * product with no rank yet (new/untracked item) sorts to the end rather
 * than the top - treating "unranked" as "least popular" rather than
 * "most", which is what a plain ascending sort on a nullable number would
 * otherwise do (null/undefined would sort first).
 */
function sortProducts(products: WholesaleCatalog["products"], sort: SortOption) {
  const sorted = [...products];
  switch (sort) {
    case "popular":
      sorted.sort((a, b) => {
        if (a.salesRank == null && b.salesRank == null) return a.name.localeCompare(b.name);
        if (a.salesRank == null) return 1;
        if (b.salesRank == null) return -1;
        return a.salesRank - b.salesRank;
      });
      break;
    case "az":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "price_desc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "price_asc":
      sorted.sort((a, b) => a.price - b.price);
      break;
  }
  return sorted;
}

export function CatalogBrowser({ catalog }: { catalog: WholesaleCatalog }) {
  const [rangeFilter, setRangeFilter] = useState(ALL);
  const [fillingFilter, setFillingFilter] = useState(ALL);
  const [sort, setSort] = useState<SortOption>("popular");

  const filtered = useMemo(
    () =>
      sortProducts(
        catalog.products.filter(
          (product) =>
            (rangeFilter === ALL || product.rangeId === rangeFilter) &&
            (fillingFilter === ALL || product.fillingId === fillingFilter),
        ),
        sort,
      ),
    [catalog.products, rangeFilter, fillingFilter, sort],
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
      <div className="sd-sort-row">
        <label htmlFor="catalog-sort">Sort by</label>
        <select
          id="catalog-sort"
          className="sd-sort-select"
          value={sort}
          onChange={(event) => setSort(event.target.value as SortOption)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

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

      <div className="sd-catalog-grid">
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
      <div className="sd-product-image">
        {product.imageBlobUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Vercel Blob URLs, not a local/optimizable asset
          <img src={product.imageBlobUrl} alt={product.name} />
        ) : (
          <Candy aria-hidden="true" size={32} />
        )}
      </div>
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
            <Minus size={16} aria-hidden="true" />
          </button>
          <span>{quantity}</span>
          <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((q) => q + 1)}>
            <Plus size={16} aria-hidden="true" />
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
          {added ? (
            <>
              <Check size={16} aria-hidden="true" /> Added
            </>
          ) : (
            "Add"
          )}
        </button>
      </div>
    </div>
  );
}
