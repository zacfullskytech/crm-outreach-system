"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { SegmentFieldOption } from "@/lib/segment-fields";

const serviceOptions = [
  "Phones",
  "Internet",
  "Managed I.T. Services",
  "Firewall",
  "Website and Hosting Services",
  "X-Ray Rental Services",
  "Dark Web Monitoring",
  "Pay Roll and HR Services",
] as const;

type SegmentRule = {
  field: string;
  comparator: string;
  value: string;
};

const comparators = [
  "equals",
  "not_equals",
  "contains",
  "starts_with",
  "ends_with",
  "is_empty",
  "is_not_empty",
  "has",
  "not_has",
] as const;

export function SegmentForm({ fieldOptions }: { fieldOptions: SegmentFieldOption[] }) {
  const [rules, setRules] = useState<SegmentRule[]>([
    { field: "company.industry", comparator: "equals", value: "Veterinary" },
    { field: "company.state", comparator: "equals", value: "OH" },
    { field: "company.services", comparator: "not_has", value: "Internet" },
  ]);
  const [entityType, setEntityType] = useState("contact");
  const [operator, setOperator] = useState("AND");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const visibleFieldOptions = useMemo(
    () => fieldOptions.filter((option) => option.entityType === entityType),
    [entityType, fieldOptions],
  );

  useEffect(() => {
    setRules((current) =>
      current.map((rule, index) => {
        if (visibleFieldOptions.some((option) => option.value === rule.field)) {
          return rule;
        }

        return {
          ...rule,
          field: visibleFieldOptions[index]?.value || visibleFieldOptions[0]?.value || "",
        };
      }),
    );
  }, [entityType, visibleFieldOptions]);

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
    const fallbackField = visibleFieldOptions[0]?.value || "";
    setRules((current) => [...current, { field: fallbackField, comparator: "equals", value: "" }]);
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
      body: JSON.stringify({ entityType, filterJson }),
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

    formRef.current?.reset();
    setRules([{ field: visibleFieldOptions[0]?.value || "", comparator: "equals", value: "" }]);
    setPreviewCount(null);
    setMessage("Segment created. Refresh to see it in the table.");
    setPending(false);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="inline-grid">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="segment-name">Segment name</label>
          <input id="segment-name" name="name" placeholder="Ohio Veterinary Clients Without Internet" required />
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
        <textarea id="segment-description" name="description" placeholder="Veterinary clients in Ohio who are not currently using us for internet services." />
      </div>
      <div className="card">
        <h3>Rules</h3>
        <div className="inline-grid">
          {rules.map((rule, index) => {
            const isServiceField = rule.field === "services" || rule.field === "company.services";
            return (
              <div key={`${rule.field}-${index}`} className="form-grid">
                <div className="field">
                  <label htmlFor={`field-${index}`}>Field</label>
                  <select id={`field-${index}`} value={rule.field} onChange={(event) => updateRule(index, { field: event.target.value })}>
                    {visibleFieldOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`comparator-${index}`}>Comparator</label>
                  <select id={`comparator-${index}`} value={rule.comparator} onChange={(event) => updateRule(index, { comparator: event.target.value })}>
                    {comparators
                      .filter((comparator) => !isServiceField || comparator === "has" || comparator === "not_has")
                      .map((comparator) => (
                        <option key={comparator} value={comparator}>
                          {comparator}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`value-${index}`}>Value</label>
                  {isServiceField ? (
                    <select id={`value-${index}`} value={rule.value} onChange={(event) => updateRule(index, { value: event.target.value })}>
                      <option value="">Select service</option>
                      {serviceOptions.map((service) => (
                        <option key={service} value={service}>
                          {service}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`value-${index}`}
                      value={rule.value}
                      onChange={(event) => updateRule(index, { value: event.target.value })}
                      disabled={rule.comparator === "is_empty" || rule.comparator === "is_not_empty"}
                      placeholder="TX"
                    />
                  )}
                </div>
                <div className="actions">
                  <button className="button secondary" type="button" onClick={() => removeRule(index)} disabled={rules.length === 1}>
                    Remove Rule
                  </button>
                </div>
              </div>
            );
          })}
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
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Create Segment"}
        </button>
        {message ? <span className="help">{message}</span> : null}
      </div>
    </form>
  );
}
