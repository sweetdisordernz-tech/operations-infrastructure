import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { AdminNav } from "@/app/_components/admin-nav";
import { LogoutButton } from "@/app/_components/logout-button";

export default async function AdminAuthenticatedLayout({
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
          <span className="sd-topbar-surface">Master Connect</span>
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
