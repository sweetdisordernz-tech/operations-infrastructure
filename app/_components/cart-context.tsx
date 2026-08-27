"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Region } from "@prisma/client";

export type CartItem = { productId: string; quantity: number; region: Region };

type CartContextValue = {
  items: CartItem[];
  addItem: (productId: string, quantity: number, region?: Region) => void;
  updateQuantity: (productId: string, region: Region, quantity: number) => void;
  removeItem: (productId: string, region: Region) => void;
  setItemRegion: (productId: string, fromRegion: Region, toRegion: Region) => void;
  clear: () => void;
  totalItemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(customerId: string) {
  return `sd-wholesale-cart-${customerId}`;
}

function itemKey(productId: string, region: Region) {
  return `${productId}:${region}`;
}

/**
 * Client-side cart (React Context + localStorage, scoped by customerId so a
 * shared browser can't leak one customer's cart into another's session).
 * There's no server-side cart model - prices and stock are always
 * re-validated fresh at checkout time (lib/wholesale/checkout.ts), so
 * nothing here needs to be authoritative.
 */
export function CartProvider({
  customerId,
  defaultRegion,
  children,
}: {
  customerId: string;
  defaultRegion: Region;
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(customerId));
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // Private browsing, quota, etc. - just start with an empty cart.
    }
    setHydrated(true);
  }, [customerId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey(customerId), JSON.stringify(items));
    } catch {
      // Nothing useful to do if storage isn't available.
    }
  }, [items, customerId, hydrated]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem: (productId, quantity, region = defaultRegion) => {
        setItems((prev) => {
          const key = itemKey(productId, region);
          const existing = prev.find((item) => itemKey(item.productId, item.region) === key);
          if (existing) {
            return prev.map((item) =>
              itemKey(item.productId, item.region) === key
                ? { ...item, quantity: item.quantity + quantity }
                : item,
            );
          }
          return [...prev, { productId, quantity, region }];
        });
      },
      updateQuantity: (productId, region, quantity) => {
        const key = itemKey(productId, region);
        setItems((prev) =>
          quantity <= 0
            ? prev.filter((item) => itemKey(item.productId, item.region) !== key)
            : prev.map((item) => (itemKey(item.productId, item.region) === key ? { ...item, quantity } : item)),
        );
      },
      removeItem: (productId, region) => {
        const key = itemKey(productId, region);
        setItems((prev) => prev.filter((item) => itemKey(item.productId, item.region) !== key));
      },
      setItemRegion: (productId, fromRegion, toRegion) => {
        setItems((prev) => {
          const fromKey = itemKey(productId, fromRegion);
          const moving = prev.find((item) => itemKey(item.productId, item.region) === fromKey);
          if (!moving) return prev;

          const toKey = itemKey(productId, toRegion);
          const rest = prev.filter((item) => itemKey(item.productId, item.region) !== fromKey);
          const existingTarget = rest.find((item) => itemKey(item.productId, item.region) === toKey);

          if (existingTarget) {
            return rest.map((item) =>
              itemKey(item.productId, item.region) === toKey
                ? { ...item, quantity: item.quantity + moving.quantity }
                : item,
            );
          }
          return [...rest, { ...moving, region: toRegion }];
        });
      },
      clear: () => setItems([]),
      totalItemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    [items, defaultRegion],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
