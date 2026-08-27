import { PinLoginForm } from "@/app/_components/pin-login-form";

export default function FloorLoginPage() {
  return (
    <div className="sd-shell">
      <main className="sd-main">
        <div className="sd-card">
          <h1>Floor sign in</h1>
          <p>Enter your 4-digit employee PIN.</p>
          <PinLoginForm />
        </div>
      </main>
    </div>
  );
}
