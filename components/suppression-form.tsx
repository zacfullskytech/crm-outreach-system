"use client";

import { FormEvent, useState } from "react";

export function SuppressionForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") || ""),
      reason: String(form.get("reason") || "MANUAL"),
      source: String(form.get("source") || "manual ui"),
    };

    const response = await fetch("/api/suppressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to add suppression.");
      setPending(false);
      return;
    }

    event.currentTarget.reset();
    setMessage("Suppression added. Refresh to see the new record.");
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="inline-grid">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="suppression-email">Email</label>
          <input id="suppression-email" name="email" type="email" placeholder="recipient@example.com" required />
        </div>
        <div className="field">
          <label htmlFor="suppression-reason">Reason</label>
          <select id="suppression-reason" name="reason" defaultValue="MANUAL">
            <option value="MANUAL">MANUAL</option>
            <option value="UNSUBSCRIBE">UNSUBSCRIBE</option>
            <option value="BOUNCE">BOUNCE</option>
            <option value="COMPLAINT">COMPLAINT</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="suppression-source">Source</label>
          <input id="suppression-source" name="source" defaultValue="manual ui" />
        </div>
      </div>
      <div className="actions">
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Add Suppression"}
        </button>
        {message ? <span className="help">{message}</span> : null}
      </div>
    </form>
  );
}
