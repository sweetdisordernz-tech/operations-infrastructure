"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/app/_components/cart-context";

const TABS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/catalog", label: "Catalog", icon: "🍬" },
  { href: "/cart", label: "Cart", icon: "🛒" },
  { href: "/orders", label: "Orders", icon: "📦" },
];

export function PortalBottomNav() {
  const pathname = usePathname();
  const { totalItemCount } = useCart();

  return (
    <nav className="sd-bottom-nav" aria-label="Portal navigation">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link key={tab.href} href={tab.href} className={isActive ? "active" : undefined}>
            <span className="sd-bottom-nav-icon">
              {tab.icon}
              {tab.href === "/cart" && totalItemCount > 0 && (
                <span className="sd-cart-badge">{totalItemCount}</span>
              )}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
