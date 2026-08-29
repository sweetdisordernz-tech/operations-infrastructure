import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { OpsNav } from "@/app/_components/ops-nav";
import { LogoutButton } from "@/app/_components/logout-button";

export default async function OpsAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminPageUser();

  return (
    <div className="sd-shell">
      <header className="sd-topbar">
        <span className="sd-topbar-brand">Sweet Disorder Ops</span>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="sd-topbar-surface">Owner Dashboard</span>
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
