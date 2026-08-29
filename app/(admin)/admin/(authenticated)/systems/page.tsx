import Link from "next/link";
import { Package, Tag, Users, Truck, DollarSign, Building2 } from "lucide-react";
import { requireAdminPageUser } from "@/lib/admin/require-page-user";

const LINKS = [
  { href: "/inventory", label: "Inventory & Filling", description: "Stock levels, manual adjustment, filling rollup.", Icon: Package },
  { href: "/compliance", label: "Label Compliance", description: "Worklist sorted by urgency.", Icon: Tag },
  { href: "/employees", label: "Employee Productivity", description: "Logged labour hours per employee per day.", Icon: Users },
  { href: "/products", label: "Products", description: "Full catalog CRUD - range, packaging, filling, SKU.", Icon: Truck },
  { href: "/suppliers", label: "Suppliers", description: "Bulk filling/lolly suppliers and lead times.", Icon: Building2 },
  { href: "/pricing-tiers", label: "Pricing Tiers", description: "Regional pricing tiers and per-SKU overrides.", Icon: DollarSign },
  { href: "/customers", label: "Wholesale Customers", description: "Customer accounts and region/tier assignment.", Icon: Users },
];

export default async function SystemsPage() {
  await requireAdminPageUser();

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Systems & Records</h1>
          <p>Everything that isn&apos;t a live order feed lives here - catalog, suppliers, pricing, and people.</p>
        </div>
      </div>

      <div className="sd-tile-grid">
        {LINKS.map(({ href, label, description, Icon }) => (
          <Link key={href} href={href} className="sd-tile">
            <span className="sd-tile-icon">
              <Icon aria-hidden="true" size={26} />
            </span>
            <span className="sd-card-title">{label}</span>
            <span className="sd-tile-meta">{description}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
