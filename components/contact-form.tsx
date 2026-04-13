"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { CustomFieldsEditor } from "@/components/custom-fields-editor";
import { customFieldsToPairs } from "@/lib/custom-fields";
import type { Contact } from "@prisma/client";

type CompanyOption = {
  id: string;
  name: string;
};

type ContactRecord = Contact & {
  company?: CompanyOption | null;
};

export function ContactForm({
  companies,
  contact,
  onSaved,
  onDeleted,
  submitLabel = "Create Contact",
}: {
  companies: CompanyOption[];
  contact?: ContactRecord;
  onSaved?: (contact: ContactRecord) => void;
  onDeleted?: (id: string) => void;
  submitLabel?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [customFields, setCustomFields] = useState(() =>
    customFieldsToPairs(contact?.customFieldsJson).map((field, index) => ({ ...field, id: `${index}-${field.key}` })),
  );
  const formRef = useRef<HTMLFormElement | null>(null);

  const isEdit = Boolean(contact);
  const actionLabel = useMemo(() => (pending ? "Saving..." : submitLabel), [pending, submitLabel]);

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
      status: String(form.get("status") || "ACTIVE"),
      customFields: customFields.map(({ key, value }) => ({ key, value })),
    };

    const response = await fetch(isEdit ? `/api/contacts/${contact!.id}` : "/api/contacts", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || `Failed to ${isEdit ? "save" : "create"} contact.`);
      setPending(false);
      return;
    }

    if (!isEdit) {
      formRef.current?.reset();
      setCustomFields([]);
    }

    onSaved?.(body.data);
    setMessage(isEdit ? "Contact saved." : "Contact created.");
    setPending(false);
  }

  async function handleDelete() {
    if (!contact) return;
    if (!window.confirm(`Delete ${contact.fullName || contact.email || "this contact"}?`)) return;

    setPending(true);
    setMessage(null);

    const response = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(body.error || "Failed to delete contact.");
      setPending(false);
      return;
    }

    onDeleted?.(contact.id);
    setMessage("Contact deleted.");
    setPending(false);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="inline-grid">
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`contact-full-name-${contact?.id || "new"}`}>Full name</label>
          <input id={`contact-full-name-${contact?.id || "new"}`} name="fullName" placeholder="Sarah Cole" defaultValue={contact?.fullName || ""} />
        </div>
        <div className="field">
          <label htmlFor={`contact-email-${contact?.id || "new"}`}>Email</label>
          <input id={`contact-email-${contact?.id || "new"}`} name="email" type="email" placeholder="sarah@example.com" defaultValue={contact?.email || ""} />
        </div>
        <div className="field">
          <label htmlFor={`contact-phone-${contact?.id || "new"}`}>Phone</label>
          <input id={`contact-phone-${contact?.id || "new"}`} name="phone" placeholder="+1 555 0101" defaultValue={contact?.phone || ""} />
        </div>
        <div className="field">
          <label htmlFor={`contact-job-title-${contact?.id || "new"}`}>Job title</label>
          <input id={`contact-job-title-${contact?.id || "new"}`} name="jobTitle" placeholder="Practice Manager" defaultValue={contact?.jobTitle || ""} />
        </div>
        <div className="field">
          <label htmlFor={`contact-company-${contact?.id || "new"}`}>Company</label>
          <select id={`contact-company-${contact?.id || "new"}`} name="companyId" defaultValue={contact?.companyId || ""}>
            <option value="">Unlinked</option>
            {companies.map((companyOption) => (
              <option key={companyOption.id} value={companyOption.id}>
                {companyOption.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`contact-status-${contact?.id || "new"}`}>Status</label>
          <select id={`contact-status-${contact?.id || "new"}`} name="status" defaultValue={contact?.status || "ACTIVE"}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="UNSUBSCRIBED">UNSUBSCRIBED</option>
            <option value="BOUNCED">BOUNCED</option>
            <option value="INVALID">INVALID</option>
            <option value="DO_NOT_CONTACT">DO_NOT_CONTACT</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`contact-source-${contact?.id || "new"}`}>Source</label>
          <input id={`contact-source-${contact?.id || "new"}`} name="source" placeholder="manual entry" defaultValue={contact?.source || ""} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`contact-notes-${contact?.id || "new"}`}>Notes</label>
        <textarea id={`contact-notes-${contact?.id || "new"}`} name="notes" placeholder="Context, relationship notes, or campaign history." defaultValue={contact?.notes || ""} />
      </div>
      <CustomFieldsEditor entity="contact" fields={customFields} onChange={setCustomFields} />
      <div className="actions">
        <button className="button primary" type="submit" disabled={pending}>
          {actionLabel}
        </button>
        {contact ? (
          <button className="button secondary" type="button" disabled={pending} onClick={() => void handleDelete()}>
            Delete Contact
          </button>
        ) : null}
        {message ? <span className="help">{message}</span> : null}
      </div>
    </form>
  );
}
