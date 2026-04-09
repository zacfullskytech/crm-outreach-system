"use client";

import { FormEvent, useState } from "react";

export function TagForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || ""),
      color: String(form.get("color") || "") || null,
    };

    const response = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to create tag.");
      setPending(false);
      return;
    }

    event.currentTarget.reset();
    setMessage("Tag created. Refresh to see the new tag.");
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="inline-grid">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="tag-name">Tag name</label>
          <input id="tag-name" name="name" placeholder="warm lead" required />
        </div>
        <div className="field">
          <label htmlFor="tag-color">Color</label>
          <input id="tag-color" name="color" placeholder="#b8572f" />
        </div>
      </div>
      <div className="actions">
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Create Tag"}
        </button>
        {message ? <span className="help">{message}</span> : null}
      </div>
    </form>
  );
}
