"use client";

import { FormEvent, useState } from "react";

export function ProspectForm({ onSaved }: { onSaved?: (prospect: Record<string, unknown>) => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      companyName: String(form.get("companyName") || ""),
      contactName: String(form.get("contactName") || "") || null,
      email: String(form.get("email") || "") || null,
      phone: String(form.get("phone") || "") || null,
      website: String(form.get("website") || "") || null,
      industry: String(form.get("industry") || "") || null,
      businessType: String(form.get("businessType") || "") || null,
      city: String(form.get("city") || "") || null,
      state: String(form.get("state") || "") || null,
      postalCode: String(form.get("postalCode") || "") || null,
      source: String(form.get("source") || "") || null,
      sourceUrl: String(form.get("sourceUrl") || "") || null,
      notes: String(form.get("notes") || "") || null,
      qualificationStatus: String(form.get("qualificationStatus") || "NEW"),
    };

    const response = await fetch("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(body.error || "Failed to create prospect.");
      setPending(false);
      return;
    }

    event.currentTarget.reset();
    onSaved?.(body.data);
    setMessage("Prospect created.");
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="inline-grid">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="prospect-company-name">Company name</label>
          <input id="prospect-company-name" name="companyName" placeholder="Blue River Animal Hospital" required />
        </div>
        <div className="field">
          <label htmlFor="prospect-contact-name">Contact name</label>
          <input id="prospect-contact-name" name="contactName" placeholder="Megan Lee" />
        </div>
        <div className="field">
          <label htmlFor="prospect-email">Email</label>
          <input id="prospect-email" name="email" type="email" placeholder="megan@example.com" />
        </div>
        <div className="field">
          <label htmlFor="prospect-phone">Phone</label>
          <input id="prospect-phone" name="phone" placeholder="+1 555 0112" />
        </div>
        <div className="field">
          <label htmlFor="prospect-website">Website</label>
          <input id="prospect-website" name="website" placeholder="clinic.example.com" />
        </div>
        <div className="field">
          <label htmlFor="prospect-industry">Industry</label>
          <input id="prospect-industry" name="industry" placeholder="Veterinary" />
        </div>
        <div className="field">
          <label htmlFor="prospect-business-type">Business type</label>
          <input id="prospect-business-type" name="businessType" placeholder="Independent Clinic" />
        </div>
        <div className="field">
          <label htmlFor="prospect-city">City</label>
          <input id="prospect-city" name="city" placeholder="Fort Worth" />
        </div>
        <div className="field">
          <label htmlFor="prospect-state">State</label>
          <input id="prospect-state" name="state" maxLength={2} placeholder="TX" />
        </div>
        <div className="field">
          <label htmlFor="prospect-postal-code">Postal code</label>
          <input id="prospect-postal-code" name="postalCode" placeholder="76102" />
        </div>
        <div className="field">
          <label htmlFor="prospect-source">Source</label>
          <input id="prospect-source" name="source" placeholder="directory import" />
        </div>
        <div className="field">
          <label htmlFor="prospect-status">Qualification status</label>
          <select id="prospect-status" name="qualificationStatus" defaultValue="NEW">
            <option value="NEW">NEW</option>
            <option value="REVIEWING">REVIEWING</option>
            <option value="QUALIFIED">QUALIFIED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="prospect-source-url">Source URL</label>
        <input id="prospect-source-url" name="sourceUrl" placeholder="https://directory.example.com/clinic" />
      </div>
      <div className="field">
        <label htmlFor="prospect-notes">Notes</label>
        <textarea id="prospect-notes" name="notes" placeholder="Fit notes, qualification signals, or next-step context." />
      </div>
      <div className="actions">
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Create Prospect"}
        </button>
        {message ? <span className="help">{message}</span> : null}
      </div>
    </form>
  );
}
