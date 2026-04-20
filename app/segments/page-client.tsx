"use client";

import { useMemo, useState } from "react";
import { SegmentForm } from "@/components/segment-form";
import { AppShell } from "@/components/app-shell";
import type { Segment } from "@prisma/client";
import type { SegmentFieldOption } from "@/lib/segment-fields";

export function SegmentsPageClient({
  initialSegments,
  fieldOptions,
  isAdmin,
}: {
  initialSegments: Segment[];
  fieldOptions: SegmentFieldOption[];
  isAdmin: boolean;
}) {
  const [segments, setSegments] = useState(initialSegments);
  const [listMessage, setListMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(true);

  const filteredSegments = useMemo(() => {
    const q = query.toLowerCase();
    return segments.filter((segment) => {
      const rules = (segment.filterJson as { rules?: unknown[] })?.rules ?? [];
      const haystack = [segment.name, segment.description || "", segment.entityType, `${rules.length} rules`].join(" ").toLowerCase();
      return (!q || haystack.includes(q)) && (entityFilter === "ALL" || segment.entityType === entityFilter);
    });
  }, [segments, query, entityFilter]);

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Segments</span>
          <h2>Store filters as reusable audience logic.</h2>
          <p>
            Segment definitions stay in JSON so the same logic can drive previews, campaigns, and prospect review queues.
          </p>
        </section>

        <section className="card form-section collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>New Segment</h3>
              <p className="help">Create a new reusable audience only when you need one. Existing segments stay below for cleanup.</p>
            </div>
            <button className="button secondary" type="button" onClick={() => setIsCreateOpen((value) => !value)}>
              {isCreateOpen ? "Collapse" : "Expand"}
            </button>
          </div>
          {isCreateOpen ? (
            <SegmentForm
              fieldOptions={fieldOptions}
              onSaved={(segment) => {
                setSegments((current) => [segment as Segment, ...current.filter((entry) => entry.id !== segment.id)]);
                setListMessage("Segment saved.");
                setIsCreateOpen(false);
              }}
            />
          ) : null}
        </section>

        <section className="card collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>All Segments</h3>
              <p className="help">{filteredSegments.length} segment{filteredSegments.length === 1 ? "" : "s"} in view.</p>
            </div>
            <div className="actions">
              {listMessage ? <span className="help">{listMessage}</span> : null}
              <button className="button secondary" type="button" onClick={() => setIsListOpen((value) => !value)}>
                {isListOpen ? "Collapse" : "Expand"}
              </button>
            </div>
          </div>

          {isListOpen ? (
            <>
              <div className="filter-row">
                <div className="search-wrap">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search segments..." />
                </div>
                <select className="filter-select" value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)}>
                  <option value="ALL">All entity types</option>
                  <option value="contact">contact</option>
                  <option value="company">company</option>
                  <option value="prospect">prospect</option>
                </select>
              </div>

              {filteredSegments.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-icon">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12l2 2 4-4" />
              </svg>
              <p>No segments yet.</p>
            </div>
              ) : (
                <div className="inline-grid">
                  {filteredSegments.map((segment) => {
                const rules = (segment.filterJson as { rules?: unknown[] })?.rules ?? [];
                return (
                  <details key={segment.id} className="card content-item" open={false}>
                    <summary className="card-header content-item-summary">
                      <div>
                        <h3>{segment.name}</h3>
                        <p className="help">{segment.description || "No description"}</p>
                        <p className="help">{rules.length} rule{rules.length !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="content-item-summary-right">
                        <span className="badge">{segment.entityType}</span>
                        <span className="help">Edit or delete</span>
                      </div>
                    </summary>
                    <div className="content-item-body">
                      <SegmentForm
                        fieldOptions={fieldOptions}
                        segment={segment}
                        submitLabel="Save Segment"
                        onSaved={(saved) => {
                          setSegments((current) => current.map((entry) => (entry.id === saved.id ? (saved as Segment) : entry)));
                          setListMessage("Segment updated.");
                        }}
                        onDeleted={(id) => {
                          setSegments((current) => current.filter((entry) => entry.id !== id));
                          setListMessage("Segment deleted.");
                        }}
                      />
                    </div>
                  </details>
                );
                  })}
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
