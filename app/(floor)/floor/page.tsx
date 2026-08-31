import { redirect } from "next/navigation";
import { Tag, Package, Truck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";

// Always render per-request (never statically prerendered at build time).
export const dynamic = "force-dynamic";

export default async function FloorHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="sd-shell">
      <div className="sd-floor-header">
        <span className="sd-floor-logo">Sweet Disorder</span>
        <h1>Sweet Disorder Floor</h1>
      </div>
      <main className="sd-main">
        <nav className="sd-station-grid" aria-label="Choose a station">
          <a className="sd-station-button sd-station-button--label" href="/label">
            <Tag aria-hidden="true" />
            Labelling &amp; filling
          </a>
          <a className="sd-station-button sd-station-button--pack" href="/pack">
            <Package aria-hidden="true" />
            Packing
          </a>
          <a className="sd-station-button sd-station-button--dispatch" href="/dispatch">
            <Truck aria-hidden="true" />
            Dispatch
          </a>
        </nav>
      </main>
    </div>
  );
}
