"use client";

import { FormEvent, useMemo, useState } from "react";

type SegmentRule = {
  field: string;
  comparator: string;
  value: string;
};

const fieldOptions = [
  { value: "company.industry", label: "Company industry" },
  { value: "company.state", label: "Company state" },
  { value: "company.city", label: "Company city" },
  { value: "company.businessType", label: "Company business type" },
  { value: "status", label: "Contact status" },
  { value: "email", label: "Contact email" },
  { value: "fullName", label: "Contact full name" },
] as const;

const comparators = [
  "equals",
  "not_equals",
  "contains",
  "starts_with",
  "ends_with",
  "is_empty",
  "is_not_empty",
] as const;

export function SegmentForm() {
  const [rules, setRules] = useState<SegmentRule[]>([
    { field: "company.industry", comparator: "equals", value: "Veterinary" },
  ]);
  const [entityType, setEntityType] = useState("contact");
  const [operator, setOperator] = useState("AND");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const filterJson = useMemo(
    () => ({
      operator,
      rules: rules.map((rule) => ({
        field: rule.field,
        comparator: rule.comparator,
        value: rule.comparator === "is_empty" || rule.comparator === "is_not_empty" ? undefined : rule.value,
      })),
    }),
    [operator, rules],
  );

  function updateRule(index: number, patch: Partial<SegmentRule>) {
    setRules((current) => current.map((rule, currentIndex) => (currentIndex === index ? { ...rule, ...patch } : rule)));
  }

  function addRule() {
    setRules((current) => [...current, { field: "company.state", comparator: "equals", value: "TX" }]);
  }

  function removeRule(index: number) {
    setRules((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function previewSegment() {
    setPending(true);
    setMessage(null);
    setPreviewCount(null);

    const response = await fetch("/api/segments/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filterJson }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to preview segment.");
      setPending(false);
      return;
    }

    setPreviewCount(body.count);
    setPending(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || ""),
      description: String(form.get("description") || "") || null,
      entityType,
      filterJson,
    };

    const response = await fetch("/api/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to create segment.");
      setPending(false);
      return;
    }

    event.currentTarget.reset();
    setRules([{ field: "company.industry", comparator: "equals", value: "Veterinary" }]);
    setPreviewCount(null);
    setMessage("Segment created. Refresh to see it in the table.");
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="inline-grid">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="segment-name">Segment name</label>
          <input id="segment-name" name="name" placeholder="Texas Veterinary Contacts" required />
        </div>
        <div className="field">
          <label htmlFor="segment-entity-type">Entity type</label>
          <select id="segment-entity-type" value={entityType} onChange={(event) => setEntityType(event.target.value)}>
            <option value="contact">contact</option>
            <option value="company">company</option>
            <option value="prospect">prospect</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="segment-operator">Operator</label>
          <select id="segment-operator" value={operator} onChange={(event) => setOperator(event.target.value)}>
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="segment-description">Description</label>
        <textarea id="segment-description" name="description" placeholder="Target veterinary contacts in Texas with deliverable email addresses." />
      </div>
      <div className="card">
        <h3>Rules</h3>
        <div className="inline-grid">
          {rules.map((rule, index) => (
            <div key={`${rule.field}-${index}`} className="form-grid">
              <div className="field">
                <label htmlFor={`field-${index}`}>Field</label>
                <select id={`field-${index}`} value={rule.field} onChange={(event) => updateRule(index, { field: event.target.value })}>
                  {fieldOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`comparator-${index}`}>Comparator</label>
                <select id={`comparator-${index}`} value={rule.comparator} onChange={(event) => updateRule(index, { comparator: event.target.value })}>
                  {comparators.map((comparator) => (
                    <option key={comparator} value={comparator}>
                      {comparator}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`value-${index}`}>Value</label>
                <input
                  id={`value-${index}`}
                  value={rule.value}
                  onChange={(event) => updateRule(index, { value: event.target.value })}
                  disabled={rule.comparator === "is_empty" || rule.comparator === "is_not_empty"}
                  placeholder="TX"
                />
              </div>
              <div className="actions">
                <button className="button secondary" type="button" onClick={() => removeRule(index)} disabled={rules.length === 1}>
                  Remove Rule
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="actions">
          <button className="button secondary" type="button" onClick={addRule}>
            Add Rule
          </button>
          <button className="button secondary" type="button" onClick={previewSegment} disabled={pending}>
            {pending ? "Previewing..." : "Preview Count"}
          </button>
          {previewCount !== null ? <span className="help">Matching records: {previewCount}</span> : null}
        </div>
      </div>
      <div className="actions">
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Create Segment"}
        </button>
        {message ? <span className="help">{message}</span> : null}
      </div>
    </form>
  );
}
