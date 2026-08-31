import Link from "next/link";
import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { AdminNav } from "@/app/_components/admin-nav";
import { LogoutButton } from "@/app/_components/logout-button";
import { crossSurfaceHref } from "@/lib/subdomains";

// Always render per-request (never statically prerendered at build time) -
// this page shows live per-user, per-request business data regardless of
// how the current user is resolved.
export const dynamic = "force-dynamic";

export default async function AdminAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminPageUser();
  const opsHref = await crossSurfaceHref("ops");

  return (
    <div className="sd-shell">
      <header className="sd-topbar">
        <Link className="sd-topbar-brand" href="/">
          Sweet Disorder Ops
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="sd-topbar-surface">Master Connect</span>
          <a className="sd-topbar-switch" href={opsHref}>
            Switch to Owner Dashboard
          </a>
          <span className="sd-caption" style={{ margin: 0 }}>
            {user.name}
          </span>
          <LogoutButton />
        </div>
      </header>
      <AdminNav />
      <main className="sd-admin-content">{children}</main>
    </div>
  );
}
