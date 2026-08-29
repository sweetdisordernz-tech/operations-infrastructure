"use client";

import { useState, type FormEvent } from "react";

export function PinLoginForm({ redirectTo }: { redirectTo: string }) {
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("checking");
    setMessage(null);

    try {
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong");
        return;
      }
      setStatus("success");
      setMessage(`Welcome, ${data.name}`);
      // Full navigation (not client-side router) so the new session cookie
      // is picked up by the server on the very next render.
      window.location.href = redirectTo;
    } catch {
      setStatus("error");
      setMessage("Network error - please try again");
    }
  }

  return (
    <form className="sd-form" onSubmit={handleSubmit}>
      <input
        type="password"
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        required
        placeholder="4-digit PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
      />
      <button type="submit" disabled={status === "checking" || pin.length !== 4}>
        {status === "checking" ? "Checking..." : "Sign in"}
      </button>
      {message && <p className={status === "error" ? "sd-action-error" : "sd-note"}>{message}</p>}
    </form>
  );
}
