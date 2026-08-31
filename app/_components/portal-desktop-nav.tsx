"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/app/_components/cart-context";
import { PORTAL_NAV_TABS } from "@/app/_components/portal-nav-tabs";

/** Horizontal nav embedded in the desktop header bar - hidden on mobile via CSS (see PortalBottomNav for the mobile equivalent). */
export function PortalDesktopNav() {
  const pathname = usePathname();
  const { totalItemCount } = useCart();

  return (
    <nav className="sd-portal-desktop-nav" aria-label="Portal navigation">
      {PORTAL_NAV_TABS.map(({ href, label, Icon }) => {
        const isActive = pathname === href;
        return (
          <Link key={href} href={href} className={isActive ? "active" : undefined}>
            <Icon aria-hidden="true" size={16} />
            {label}
            {href === "/cart" && totalItemCount > 0 && (
              <span className="sd-cart-badge sd-cart-badge-inline">{totalItemCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
