"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Candy, ShoppingCart, ClipboardList } from "lucide-react";
import { useCart } from "@/app/_components/cart-context";

const TABS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/catalog", label: "Catalog", Icon: Candy },
  { href: "/cart", label: "Cart", Icon: ShoppingCart },
  { href: "/orders", label: "Orders", Icon: ClipboardList },
];

export function PortalBottomNav() {
  const pathname = usePathname();
  const { totalItemCount } = useCart();

  return (
    <nav className="sd-bottom-nav" aria-label="Portal navigation">
      {TABS.map(({ href, label, Icon }) => {
        const isActive = pathname === href;
        return (
          <Link key={href} href={href} className={isActive ? "active" : undefined}>
            <span className="sd-bottom-nav-icon">
              <Icon aria-hidden="true" />
              {href === "/cart" && totalItemCount > 0 && (
                <span className="sd-cart-badge">{totalItemCount}</span>
              )}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
