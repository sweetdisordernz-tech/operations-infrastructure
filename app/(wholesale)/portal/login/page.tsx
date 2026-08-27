import { MagicLinkLoginForm } from "@/app/_components/magic-link-login-form";

export default function WholesaleLoginPage() {
  return (
    <div className="sd-shell">
      <main className="sd-main">
        <div className="sd-card">
          <h1>Wholesale portal sign in</h1>
          <p>Enter your email and we&apos;ll send you a sign-in link.</p>
          <MagicLinkLoginForm audience="wholesale" surface="wholesale" />
        </div>
      </main>
    </div>
  );
}
