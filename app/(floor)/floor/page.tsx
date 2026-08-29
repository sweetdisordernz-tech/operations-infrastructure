import { redirect } from "next/navigation";
import { Tag, Package, Truck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function FloorHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="sd-shell">
      <div className="sd-floor-header">
        <h1>Sweet Disorder Floor</h1>
      </div>
      <main className="sd-main">
        <nav className="sd-station-grid" aria-label="Choose a station">
          <a className="sd-station-button" href="/label">
            <Tag aria-hidden="true" />
            Labelling &amp; filling
          </a>
          <a className="sd-station-button" href="/pack">
            <Package aria-hidden="true" />
            Packing
          </a>
          <a className="sd-station-button" href="/dispatch">
            <Truck aria-hidden="true" />
            Dispatch
          </a>
        </nav>
      </main>
    </div>
  );
}
