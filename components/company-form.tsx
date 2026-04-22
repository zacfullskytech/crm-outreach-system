"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { CustomFieldsEditor } from "@/components/custom-fields-editor";
import { customFieldsToPairs, normalizeCustomFieldKey } from "@/lib/custom-fields";
import type { Company } from "@prisma/client";

type CompanyRecord = Company & {
  contacts?: { id: string }[];
};

const serviceOptions = [
  "Phones",
  "Internet",
  "Managed I.T. Services",
  "Firewall",
  "Website and Hosting Services",
  "X-Ray Rental Services",
  "Xray Services",
  "Dark Web Monitoring",
  "Pay Roll and HR Services",
  "Full Rein",
] as const;

function readServices(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [] as string[];
  }

  const raw = (value as Record<string, unknown>).services;
  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry)).filter(Boolean);
  }

  if (typeof raw === "string") {
    return raw.split(",").map((entry) => entry.trim()).filter(Boolean);
  }

  return [];
}

export function CompanyForm({
  company,
  onSaved,
  onDeleted,
  submitLabel = "Create Company",
}: {
  company?: CompanyRecord;
  onSaved?: (company: CompanyRecord) => void;
  onDeleted?: (id: string) => void;
  submitLabel?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [customFields, setCustomFields] = useState(() =>
    customFieldsToPairs(company?.customFieldsJson)
      .filter((field) => field.key !== "services")
      .map((field, index) => ({ ...field, id: `${index}-${field.key}` })),
  );
  const [selectedServices, setSelectedServices] = useState<string[]>(() => readServices(company?.customFieldsJson));
  const formRef = useRef<HTMLFormElement | null>(null);

  const isEdit = Boolean(company);
  const actionLabel = useMemo(() => (pending ? "Saving..." : submitLabel), [pending, submitLabel]);

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
      email: String(form.get("email") || "") || null,
      addressLine1: String(form.get("addressLine1") || "") || null,
      addressLine2: String(form.get("addressLine2") || "") || null,
      city: String(form.get("city") || "") || null,
      state: String(form.get("state") || "") || null,
      postalCode: String(form.get("postalCode") || "") || null,
      country: String(form.get("country") || "") || null,
      source: String(form.get("source") || "") || null,
      notes: String(form.get("notes") || "") || null,
      status: String(form.get("status") || "LEAD"),
      services: selectedServices,
      customFields: [
        ...customFields.map(({ key, value }) => ({ key, value })),
        { key: normalizeCustomFieldKey("services"), value: selectedServices.join(", ") },
      ],
    };

    const response = await fetch(isEdit ? `/api/companies/${company!.id}` : "/api/companies", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || `Failed to ${isEdit ? "save" : "create"} company.`);
      setPending(false);
      return;
    }

    if (!isEdit) {
      formRef.current?.reset();
      setCustomFields([]);
      setSelectedServices([]);
    }

    onSaved?.(body.data);
    setMessage(isEdit ? "Company saved." : "Company created.");
    setPending(false);
  }

  async function handleDelete() {
    if (!company) return;
    if (!window.confirm(`Delete ${company.name}?`)) return;

    setPending(true);
    setMessage(null);

    const response = await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(body.error || "Failed to delete company.");
      setPending(false);
      return;
    }

    onDeleted?.(company.id);
    setMessage("Company deleted.");
    setPending(false);
  }

  function toggleService(service: string) {
    setSelectedServices((current) =>
      current.includes(service) ? current.filter((entry) => entry !== service) : [...current, service],
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="inline-grid">
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`company-name-${company?.id || "new"}`}>Company name</label>
          <input id={`company-name-${company?.id || "new"}`} name="name" placeholder="North Ridge Veterinary Clinic" defaultValue={company?.name || ""} required />
        </div>
        <div className="field">
          <label htmlFor={`company-industry-${company?.id || "new"}`}>Industry</label>
          <input id={`company-industry-${company?.id || "new"}`} name="industry" placeholder="Veterinary" defaultValue={company?.industry || ""} />
        </div>
        <div className="field">
          <label htmlFor={`company-business-type-${company?.id || "new"}`}>Business type</label>
          <input id={`company-business-type-${company?.id || "new"}`} name="businessType" placeholder="Independent Clinic" defaultValue={company?.businessType || ""} />
        </div>
        <div className="field">
          <label htmlFor={`company-status-${company?.id || "new"}`}>Status</label>
          <select id={`company-status-${company?.id || "new"}`} name="status" defaultValue={company?.status || "LEAD"}>
            <option value="CLIENT">CLIENT</option>
            <option value="LEAD">LEAD</option>
            <option value="PROSPECT">PROSPECT</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`company-website-${company?.id || "new"}`}>Website</label>
          <input id={`company-website-${company?.id || "new"}`} name="website" placeholder="clinic.example.com" defaultValue={company?.website || ""} />
        </div>
        <div className="field">
          <label htmlFor={`company-phone-${company?.id || "new"}`}>Phone</label>
          <input id={`company-phone-${company?.id || "new"}`} name="phone" placeholder="+1 555 0100" defaultValue={company?.phone || ""} />
        </div>
        <div className="field">
          <label htmlFor={`company-email-${company?.id || "new"}`}>Company email</label>
          <input id={`company-email-${company?.id || "new"}`} name="email" type="email" placeholder="info@clinic.example" defaultValue={company?.email || ""} />
        </div>
        <div className="field">
          <label htmlFor={`company-address-line-1-${company?.id || "new"}`}>Address line 1</label>
          <input id={`company-address-line-1-${company?.id || "new"}`} name="addressLine1" placeholder="123 Main St" defaultValue={company?.addressLine1 || ""} />
        </div>
        <div className="field">
          <label htmlFor={`company-address-line-2-${company?.id || "new"}`}>Address line 2</label>
          <input id={`company-address-line-2-${company?.id || "new"}`} name="addressLine2" placeholder="Suite 200" defaultValue={company?.addressLine2 || ""} />
        </div>
        <div className="field">
          <label htmlFor={`company-city-${company?.id || "new"}`}>City</label>
          <input id={`company-city-${company?.id || "new"}`} name="city" placeholder="Dallas" defaultValue={company?.city || ""} />
        </div>
        <div className="field">
          <label htmlFor={`company-state-${company?.id || "new"}`}>State</label>
          <input id={`company-state-${company?.id || "new"}`} name="state" maxLength={2} placeholder="TX" defaultValue={company?.state || ""} />
        </div>
        <div className="field">
          <label htmlFor={`company-postal-code-${company?.id || "new"}`}>Postal code</label>
          <input id={`company-postal-code-${company?.id || "new"}`} name="postalCode" placeholder="75201" defaultValue={company?.postalCode || ""} />
        </div>
        <div className="field">
          <label htmlFor={`company-country-${company?.id || "new"}`}>Country</label>
          <input id={`company-country-${company?.id || "new"}`} name="country" placeholder="US" defaultValue={company?.country || "US"} />
        </div>
        <div className="field">
          <label htmlFor={`company-source-${company?.id || "new"}`}>Source</label>
          <input id={`company-source-${company?.id || "new"}`} name="source" placeholder="manual entry" defaultValue={company?.source || ""} />
        </div>
      </div>
      <div className="field">
        <label>Services in use</label>
        <div className="checkbox-grid">
          {serviceOptions.map((service) => (
            <label key={service} className="checkbox-chip">
              <input type="checkbox" checked={selectedServices.includes(service)} onChange={() => toggleService(service)} />
              <span>{service}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor={`company-notes-${company?.id || "new"}`}>Notes</label>
        <textarea id={`company-notes-${company?.id || "new"}`} name="notes" placeholder="Operational notes or relationship context." defaultValue={company?.notes || ""} />
      </div>
      <CustomFieldsEditor entity="company" fields={customFields} onChange={setCustomFields} />
      <div className="actions">
        <button className="button primary" type="submit" disabled={pending}>
          {actionLabel}
        </button>
        {company ? (
          <button className="button secondary" type="button" disabled={pending} onClick={() => void handleDelete()}>
            Delete Company
          </button>
        ) : null}
        {message ? <span className="help">{message}</span> : null}
      </div>
    </form>
  );
}
