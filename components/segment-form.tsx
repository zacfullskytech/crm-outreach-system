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

type EditableSegment = {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  filterJson: unknown;
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

function readFilterJson(filterJson: unknown) {
  if (!filterJson || typeof filterJson !== "object" || Array.isArray(filterJson)) {
    return null;
  }

  return filterJson as {
    operator?: string;
    rules?: Array<{ field?: string; comparator?: string; value?: unknown }>;
  };
}

function getInitialRules(segment?: EditableSegment) {
  const savedRules = readFilterJson(segment?.filterJson)?.rules;
  if (Array.isArray(savedRules) && savedRules.length > 0) {
    return savedRules.map((rule) => ({
      field: typeof rule.field === "string" ? rule.field : "",
      comparator: typeof rule.comparator === "string" ? rule.comparator : "equals",
      value: typeof rule.value === "string" ? rule.value : "",
    }));
  }

  return [
    { field: "company.industry", comparator: "equals", value: "Veterinary" },
    { field: "company.state", comparator: "equals", value: "OH" },
    { field: "company.services", comparator: "not_has", value: "Internet" },
  ];
}

export function SegmentForm({
  fieldOptions,
  segment,
  onSaved,
  onDeleted,
  submitLabel = "Create Segment",
}: {
  fieldOptions: SegmentFieldOption[];
  segment?: EditableSegment;
  onSaved?: (segment: EditableSegment) => void;
  onDeleted?: (id: string) => void;
  submitLabel?: string;
}) {
  const [rules, setRules] = useState<SegmentRule[]>(() => getInitialRules(segment));
  const savedFilter = readFilterJson(segment?.filterJson);
  const [entityType, setEntityType] = useState(segment?.entityType || "contact");
  const [operator, setOperator] = useState(savedFilter?.operator === "OR" ? "OR" : "AND");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const recipeHints: Record<string, Array<{ label: string; text: string }>> = {
    contact: [
      { label: "Client contacts by service gap", text: "Filter contacts where company status is CLIENT and company services do not include a target service." },
      { label: "Reachable outreach audience", text: "Use contact status plus contact email and company filters to keep the audience sendable." },
    ],
    company: [
      { label: "Upsell account list", text: "Filter CLIENT companies missing Internet, Phones, or other service tags to drive account expansion." },
      { label: "Shared inbox fallback", text: "Use Company email and no linked contacts to find accounts with only general inbox coverage." },
    ],
    prospect: [
      { label: "Qualified prospect queue", text: "Filter qualification status and geography to focus follow-up on higher-confidence leads." },
      { label: "Protected duplicate review", text: "Use CRM match fields to inspect prospects that may overlap with current records." },
    ],
  };
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

    const response = await fetch(segment ? `/api/segments/${segment.id}` : "/api/segments", {
      method: segment ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || `Failed to ${segment ? "update" : "create"} segment.`);
      setPending(false);
      return;
    }

    if (segment) {
      onSaved?.(body.data);
      setMessage("Segment updated.");
      setPending(false);
      return;
    }

    formRef.current?.reset();
    setEntityType("contact");
    setOperator("AND");
    setRules([{ field: fieldOptions.find((option) => option.entityType === "contact")?.value || "", comparator: "equals", value: "" }]);
    setPreviewCount(null);
    setMessage("Segment created. Refresh to see it in the table.");
    setPending(false);
  }

  async function handleDelete() {
    if (!segment || pending) {
      return;
    }

    setPending(true);
    setMessage(null);

    const response = await fetch(`/api/segments/${segment.id}`, {
      method: "DELETE",
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to delete segment.");
      setPending(false);
      return;
    }

    onDeleted?.(segment.id);
    setMessage("Segment deleted.");
    setPending(false);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="inline-grid">
      <div className="card subtle-card">
        <div className="record-summary-main">
          <div className="record-summary-topline">
            <h3>Segment Setup</h3>
            <span className="badge badge-blue">{entityType}</span>
          </div>
          <div className="record-meta-row">
            <span>{rules.length} rule{rules.length === 1 ? "" : "s"}</span>
            <span>{operator} operator</span>
            <span>{visibleFieldOptions.length} fields available</span>
          </div>
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="segment-name">Segment name</label>
          <input id="segment-name" name="name" placeholder="Ohio Veterinary Clients Without Internet" defaultValue={segment?.name || ""} required />
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
        <textarea id="segment-description" name="description" placeholder="Veterinary clients in Ohio who are not currently using us for internet services." defaultValue={segment?.description || ""} />
      </div>
      <div className="card">
        <div className="card-header dashboard-panel-header">
          <div>
            <h3>Rules</h3>
            <p className="help">Build reusable logic for {entityType} records. Preview before saving to avoid dead segments.</p>
          </div>
        </div>
        <div className="inline-grid">
          {rules.map((rule, index) => {
            const selectedField = visibleFieldOptions.find((option) => option.value === rule.field);
            const isServiceField = selectedField?.valueType === "service";
            const isSelectableValueField = selectedField?.valueType === "enum" || selectedField?.valueType === "boolean";
            return (
              <div key={`${rule.field}-${index}`} className="form-grid segment-rule-row">
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
                  ) : isSelectableValueField ? (
                    <select
                      id={`value-${index}`}
                      value={rule.value}
                      onChange={(event) => updateRule(index, { value: event.target.value })}
                      disabled={rule.comparator === "is_empty" || rule.comparator === "is_not_empty"}
                    >
                      <option value="">Select value</option>
                      {(selectedField?.valueOptions || []).map((option) => (
                        <option key={option} value={option}>
                          {option}
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
                <div className="actions segment-rule-actions">
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

      <div className="card subtle-card">
        <h3>Operator Recipes</h3>
        <div className="inline-grid">
          {recipeHints[entityType]?.map((recipe) => (
            <div key={recipe.label} className="dashboard-list-row">
              <div className="record-summary-main">
                <strong>{recipe.label}</strong>
                <p className="help">{recipe.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="actions">
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </button>
        {segment ? (
          <button className="button secondary" type="button" disabled={pending} onClick={() => void handleDelete()}>
            Delete Segment
          </button>
        ) : null}
        {message ? <span className="help">{message}</span> : null}
      </div>
    </form>
  );
}
