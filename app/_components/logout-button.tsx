"use client";

export function LogoutButton() {
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.reload();
      }}
      style={{
        background: "transparent",
        border: "1px solid var(--sd-border)",
        color: "var(--sd-text)",
        borderRadius: "0.5rem",
        padding: "0.4rem 0.75rem",
        cursor: "pointer",
        fontSize: "0.8rem",
      }}
    >
      Sign out
    </button>
  );
}
