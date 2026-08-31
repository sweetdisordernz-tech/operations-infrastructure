import { Home, Candy, ShoppingCart, ClipboardList, type LucideIcon } from "lucide-react";

export type PortalNavTab = { href: string; label: string; Icon: LucideIcon };

/** Shared between the mobile bottom nav and the desktop top-bar nav - same tabs, two renderings. */
export const PORTAL_NAV_TABS: PortalNavTab[] = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/catalog", label: "Catalog", Icon: Candy },
  { href: "/cart", label: "Cart", Icon: ShoppingCart },
  { href: "/orders", label: "Orders", Icon: ClipboardList },
];
