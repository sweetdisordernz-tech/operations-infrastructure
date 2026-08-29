"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/orders", label: "Orders" },
  { href: "/inventory", label: "Inventory & Filling" },
  { href: "/compliance", label: "Label Compliance" },
  { href: "/employees", label: "Employees" },
  { href: "/integrations", label: "Integrations" },
  { href: "/products", label: "Products" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/pricing-tiers", label: "Pricing Tiers" },
  { href: "/customers", label: "Customers" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="sd-admin-nav" aria-label="Master Connect sections">
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
