"use client";

import { useMemo, useState } from "react";
import {
  Minus,
  Plus,
  Check,
  Candy,
  Search,
  Flame,
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Snowflake,
  Bird,
  History,
  Sparkles,
  Wind,
  Moon,
  Fish,
  Flower2,
  Heart,
  PackageOpen,
  Award,
  Coffee,
  Plus as PlusIcon,
  type LucideIcon,
} from "lucide-react";
import { useCart } from "@/app/_components/cart-context";
import { formatPackagingType } from "@/lib/format";
import type { WholesaleCatalog } from "@/lib/wholesale/catalog";

const ALL = "__all__";

type SortOption = "popular" | "az" | "price_desc" | "price_asc";

const SORT_OPTIONS: Array<{ value: SortOption; label: string; icon: LucideIcon }> = [
  { value: "popular", label: "Most Popular", icon: Flame },
  { value: "az", label: "A–Z", icon: ArrowDownAZ },
  { value: "price_desc", label: "Price: High to Low", icon: ArrowDownWideNarrow },
  { value: "price_asc", label: "Price: Low to High", icon: ArrowUpWideNarrow },
];

/**
 * Small icon nod per range, standing in for a plain text chip label - not
 * meant to be a precise illustration of each range, just a bit of visual
 * character (a kiwi for Kiwi Range, a snowflake for Christmas...). Ranges
 * not yet wholesale-visible are included too so nothing needs touching
 * here when Molly turns one on. Falls back to Candy (the same fallback the
 * product-card photo placeholder already uses) for anything unlisted.
 */
const RANGE_ICONS: Record<string, LucideIcon> = {
  "Christmas": Snowflake,
  "Kiwi Range": Bird,
  "Old Classics Range": History,
  "Sweet Disorder Core Range": Sparkles,
  "Treatmints": Wind,
  "Astrology Range": Moon,
  "Hunting & Fishing Range": Fish,
  "Garden Range": Flower2,
  "Scent Dispensary": Flame,
  "Gift Boxes": PackageOpen,
  "Valentine's Range": Heart,
  "Award Badges": Award,
  "Insulated Mugs": Coffee,
  "First Aid Kits": PlusIcon,
};

function rangeIcon(name: string): LucideIcon {
  return RANGE_ICONS[name] ?? Candy;
}

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
  const [search, setSearch] = useState("");

  const isDefaultView = rangeFilter === ALL && fillingFilter === ALL && search.trim() === "" && sort === "popular";

  // The single most-popular product, called out as a standalone spotlight
  // card only in the untouched default view (all filters clear, sort still
  // on "Most Popular") - the moment a customer starts narrowing things
  // down, a separately-styled duplicate of one card just gets in the way,
  // so it folds back into the plain grid below instead.
  const spotlight = useMemo(() => {
    if (!isDefaultView) return null;
    let best: WholesaleCatalog["products"][number] | null = null;
    let bestRank = Infinity;
    for (const product of catalog.products) {
      if (product.salesRank != null && product.salesRank < bestRank) {
        best = product;
        bestRank = product.salesRank;
      }
    }
    return best;
  }, [catalog.products, isDefaultView]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sortProducts(
      catalog.products.filter(
        (product) =>
          product.productId !== spotlight?.productId &&
          (rangeFilter === ALL || product.rangeId === rangeFilter) &&
          (fillingFilter === ALL || product.fillingId === fillingFilter) &&
          (query === "" ||
            product.name.toLowerCase().includes(query) ||
            (product.fillingName?.toLowerCase().includes(query) ?? false)),
      ),
      sort,
    );
  }, [catalog.products, rangeFilter, fillingFilter, sort, search, spotlight]);

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
      <div className="sd-search-row">
        <Search aria-hidden="true" size={16} />
        <input
          type="search"
          className="sd-search-input"
          placeholder="Search products or fillings"
          aria-label="Search products or fillings"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <p className="sd-script-accent sd-search-note" aria-hidden="true">
        psst, try searching by lolly type
      </p>

      <div className="sd-sort-toggle-row" role="radiogroup" aria-label="Sort by">
        {SORT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = sort === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              className={`sd-sort-toggle${active ? " active" : ""}`}
              onClick={() => setSort(option.value)}
            >
              <Icon aria-hidden="true" size={14} />
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="sd-filter-row" aria-label="Filter by range">
        <button
          type="button"
          className={`sd-filter-chip${rangeFilter === ALL ? " active" : ""}`}
          onClick={() => setRangeFilter(ALL)}
        >
          All ranges
        </button>
        {catalog.ranges.map((range) => {
          const Icon = rangeIcon(range.name);
          return (
            <button
              key={range.id}
              type="button"
              className={`sd-filter-chip${rangeFilter === range.id ? " active" : ""}`}
              onClick={() => setRangeFilter(range.id)}
            >
              <Icon aria-hidden="true" size={14} />
              {range.name}
            </button>
          );
        })}
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

      {spotlight && (
        <div className="sd-spotlight-wrap">
          <ProductCard product={spotlight} spotlight />
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

function ProductCard({
  product,
  spotlight = false,
}: {
  product: WholesaleCatalog["products"][number];
  /** The single #1 most-popular product, called out bigger with a Bestseller seal - see isDefaultView above. */
  spotlight?: boolean;
}) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(product.minOrderQty);
  const [added, setAdded] = useState(false);

  return (
    <div className={`sd-product-card${spotlight ? " sd-product-card--spotlight" : ""}`}>
      {spotlight && (
        <span className="sd-bestseller-seal" aria-hidden="true">
          Bestseller
        </span>
      )}
      <div className="sd-product-image">
        {product.imageBlobUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Vercel Blob URLs, not a local/optimizable asset
          <img src={product.imageBlobUrl} alt={product.name} />
        ) : (
          <Candy aria-hidden="true" size={32} />
        )}
      </div>
      <div className="sd-product-body">
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
    </div>
  );
}
