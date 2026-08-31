import Link from "next/link";
import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { OpsNav } from "@/app/_components/ops-nav";
import { LogoutButton } from "@/app/_components/logout-button";
import { crossSurfaceHref } from "@/lib/subdomains";

export default async function OpsAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminPageUser();
  const adminHref = await crossSurfaceHref("admin");

  return (
    <div className="sd-shell">
      <header className="sd-topbar">
        <Link className="sd-topbar-brand" href="/">
          Sweet Disorder Ops
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="sd-topbar-surface">Owner Dashboard</span>
          <a className="sd-topbar-switch" href={adminHref}>
            Switch to Master Connect
          </a>
          <span className="sd-caption" style={{ margin: 0 }}>
            {user.name}
          </span>
          <LogoutButton />
        </div>
      </header>
      <OpsNav />
      <main className="sd-admin-content">{children}</main>
    </div>
  );
}
