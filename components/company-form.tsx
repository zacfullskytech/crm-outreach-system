"use client";

import { FormEvent, useState } from "react";

export function CompanyForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || ""),
      industry: String(form.get("industry") || "") || null,
      businessType: String(form.get("businessType") || "") || null,
      website: String(form.get("website") || "") || null,
      phone: String(form.get("phone") || "") || null,
      city: String(form.get("city") || "") || null,
      state: String(form.get("state") || "") || null,
      postalCode: String(form.get("postalCode") || "") || null,
      source: String(form.get("source") || "") || null,
      notes: String(form.get("notes") || "") || null,
      status: String(form.get("status") || "LEAD"),
    };

    const response = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error || "Failed to create company.");
      setPending(false);
      return;
    }

    event.currentTarget.reset();
    setMessage("Company created. Refresh to see the new record.");
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="inline-grid">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="company-name">Company name</label>
          <input id="company-name" name="name" placeholder="North Ridge Veterinary Clinic" required />
        </div>
        <div className="field">
          <label htmlFor="company-industry">Industry</label>
          <input id="company-industry" name="industry" placeholder="Veterinary" />
        </div>
        <div className="field">
          <label htmlFor="company-business-type">Business type</label>
          <input id="company-business-type" name="businessType" placeholder="Independent Clinic" />
        </div>
        <div className="field">
          <label htmlFor="company-status">Status</label>
          <select id="company-status" name="status" defaultValue="LEAD">
            <option value="CLIENT">CLIENT</option>
            <option value="LEAD">LEAD</option>
            <option value="PROSPECT">PROSPECT</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="company-website">Website</label>
          <input id="company-website" name="website" placeholder="clinic.example.com" />
        </div>
        <div className="field">
          <label htmlFor="company-phone">Phone</label>
          <input id="company-phone" name="phone" placeholder="+1 555 0100" />
        </div>
        <div className="field">
          <label htmlFor="company-city">City</label>
          <input id="company-city" name="city" placeholder="Dallas" />
        </div>
        <div className="field">
          <label htmlFor="company-state">State</label>
          <input id="company-state" name="state" maxLength={2} placeholder="TX" />
        </div>
        <div className="field">
          <label htmlFor="company-postal-code">Postal code</label>
          <input id="company-postal-code" name="postalCode" placeholder="75201" />
        </div>
        <div className="field">
          <label htmlFor="company-source">Source</label>
          <input id="company-source" name="source" placeholder="manual entry" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="company-notes">Notes</label>
        <textarea id="company-notes" name="notes" placeholder="Operational notes or relationship context." />
      </div>
      <div className="actions">
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Create Company"}
        </button>
        {message ? <span className="help">{message}</span> : null}
      </div>
    </form>
  );
}
