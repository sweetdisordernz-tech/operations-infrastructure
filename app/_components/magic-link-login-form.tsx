"use client";

import { useState, type FormEvent } from "react";
import type { Surface } from "@/lib/subdomains";

export function MagicLinkLoginForm({
  audience,
  surface,
}: {
  audience: "wholesale" | "staff";
  surface: Surface;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setMessage(null);

    try {
      const res = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, audience, surface }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong");
        return;
      }
      setStatus("sent");
      setMessage(data.message);
    } catch {
      setStatus("error");
      setMessage("Network error - please try again");
    }
  }

  if (status === "sent") {
    return (
      <div>
        <p>{message}</p>
        <p className="sd-note">
          Brevo isn&apos;t wired up yet in this stage, so the link is logged
          to the server console instead of emailed.
        </p>
      </div>
    );
  }

  return (
    <form className="sd-form" onSubmit={handleSubmit}>
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Send sign-in link"}
      </button>
      {status === "error" && <p className="sd-note">{message}</p>}
    </form>
  );
}
