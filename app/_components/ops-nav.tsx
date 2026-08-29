"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/orders", label: "Orders" },
  { href: "/inventory", label: "Inventory & Products" },
  { href: "/filling", label: "Filling & Reorder" },
  { href: "/compliance", label: "Label Compliance" },
  { href: "/sales", label: "Sales & Marketing" },
];

export function OpsNav() {
  const pathname = usePathname();

  return (
    <nav className="sd-admin-nav" aria-label="Ops dashboard sections">
      {LINKS.map((link) => {
        const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} className={isActive ? "active" : undefined}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
