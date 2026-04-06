"use client";

import { FormEvent, useState } from "react";

type CompanyOption = {
  id: string;
  name: string;
};

export function ContactForm({ companies }: { companies: CompanyOption[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      companyId: String(form.get("companyId") || "") || null,
      fullName: String(form.get("fullName") || "") || null,
      email: String(form.get("email") || "") || null,
      phone: String(form.get("phone") || "") || null,
      jobTitle: String(form.get("jobTitle") || "") || null,
      source: String(form.get("source") || "") || null,
      notes: String(form.get("notes") || "") || null,
    };

    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error || "Failed to create contact.");
      setPending(false);
      return;
    }

    event.currentTarget.reset();
    setMessage("Contact created. Refresh to see the new record.");
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="inline-grid">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="contact-full-name">Full name</label>
          <input id="contact-full-name" name="fullName" placeholder="Sarah Cole" />
        </div>
        <div className="field">
          <label htmlFor="contact-email">Email</label>
          <input id="contact-email" name="email" type="email" placeholder="sarah@example.com" />
        </div>
        <div className="field">
          <label htmlFor="contact-phone">Phone</label>
          <input id="contact-phone" name="phone" placeholder="+1 555 0101" />
        </div>
        <div className="field">
          <label htmlFor="contact-job-title">Job title</label>
          <input id="contact-job-title" name="jobTitle" placeholder="Practice Manager" />
        </div>
        <div className="field">
          <label htmlFor="contact-company">Company</label>
          <select id="contact-company" name="companyId" defaultValue="">
            <option value="">Unlinked</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="contact-source">Source</label>
          <input id="contact-source" name="source" placeholder="manual entry" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="contact-notes">Notes</label>
        <textarea id="contact-notes" name="notes" placeholder="Context, relationship notes, or campaign history." />
      </div>
      <div className="actions">
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Create Contact"}
        </button>
        {message ? <span className="help">{message}</span> : null}
      </div>
    </form>
  );
}
