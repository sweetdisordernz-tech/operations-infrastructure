import { MagicLinkLoginForm } from "@/app/_components/magic-link-login-form";

export default function AdminLoginPage() {
  return (
    <div className="sd-shell">
      <main className="sd-main">
        <div className="sd-card">
          <h1>Master Connect sign in</h1>
          <p>Owner/admin sign-in link.</p>
          <MagicLinkLoginForm audience="staff" surface="admin" />
        </div>
      </main>
    </div>
  );
}
