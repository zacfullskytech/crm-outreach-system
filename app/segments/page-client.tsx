"use client";

import { useState } from "react";
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
              <h3>Create Segment</h3>
              <p className="help">Build reusable audience rules for contacts, companies, or prospects.</p>
            </div>
          </div>
          <SegmentForm
            fieldOptions={fieldOptions}
            onSaved={(segment) => {
              setSegments((current) => [segment as Segment, ...current.filter((entry) => entry.id !== segment.id)]);
              setListMessage("Segment saved.");
            }}
          />
        </section>

        <section className="card collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>All Segments</h3>
              <p className="help">{segments.length} segment{segments.length === 1 ? "" : "s"} saved.</p>
            </div>
            {listMessage ? <span className="help">{listMessage}</span> : null}
          </div>

          {segments.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-icon">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12l2 2 4-4" />
              </svg>
              <p>No segments yet.</p>
            </div>
          ) : (
            <div className="inline-grid">
              {segments.map((segment) => {
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
        </section>
      </div>
    </AppShell>
  );
}
