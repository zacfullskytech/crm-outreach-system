"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MarketingContentForm } from "@/components/marketing-content-form";
import { MarketingAiStudio } from "@/components/marketing-ai-studio";
import type { MarketingContent } from "@prisma/client";

type MarketingContentRecord = MarketingContent;

export function MarketingContentManager({ initialItems, isAdmin }: { initialItems: MarketingContentRecord[]; isAdmin: boolean }) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [serviceLine, setServiceLine] = useState("ALL");
  const [audience, setAudience] = useState("ALL");
  const [contentType, setContentType] = useState("ALL");
  const [draftSeed, setDraftSeed] = useState<Record<string, unknown> | null>(null);

  const serviceLines = Array.from(new Set(items.map((item) => item.serviceLine).filter(Boolean))) as string[];
  const audiences = Array.from(new Set(items.map((item) => item.audience).filter(Boolean))) as string[];
  const contentTypes = Array.from(new Set(items.map((item) => item.contentType).filter(Boolean))) as string[];

  function upsertItem(item: MarketingContentRecord) {
    setItems((current) => [item, ...current.filter((entry) => entry.id !== item.id)]);
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((entry) => entry.id !== id));
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((item) => {
      const tags = Array.isArray(item.tagsJson) ? item.tagsJson.map((value) => String(value)).join(" ") : "";
      const haystack = [item.title, item.description || "", item.serviceLine || "", item.audience || "", item.contentType, tags].join(" ").toLowerCase();
      return (
        (!q || haystack.includes(q)) &&
        (serviceLine === "ALL" || item.serviceLine === serviceLine) &&
        (audience === "ALL" || item.audience === audience) &&
        (contentType === "ALL" || item.contentType === contentType)
      );
    });
  }, [items, query, serviceLine, audience, contentType]);

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Marketing Content</span>
          <h2>Store, classify, and generate reusable marketing assets in one place.</h2>
          <p>
            Keep existing collateral organized by audience, service line, content type, and reusable variables, then brief new pieces without leaving the CRM.
          </p>
        </section>

        <section className="card form-section">
          <div className="card-header">
            <h3>Add Marketing Content</h3>
          </div>
          <MarketingContentForm onSaved={upsertItem} submitLabel="Create Content" draftSeed={draftSeed} onDraftApplied={() => setDraftSeed(null)} />
        </section>

        <section className="card">
          <div className="card-header">
            <h3>AI Studio</h3>
          </div>
          <MarketingAiStudio onUseDraft={(draft) => setDraftSeed(draft)} />
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Content Library</h3>
            <div className="filter-row">
              <div className="search-wrap">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search content..." />
              </div>
              <select className="filter-select" value={serviceLine} onChange={(event) => setServiceLine(event.target.value)}>
                <option value="ALL">All Services</option>
                {serviceLines.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select className="filter-select" value={audience} onChange={(event) => setAudience(event.target.value)}>
                <option value="ALL">All Audiences</option>
                {audiences.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select className="filter-select" value={contentType} onChange={(event) => setContentType(event.target.value)}>
                <option value="ALL">All Types</option>
                {contentTypes.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>{query || serviceLine !== "ALL" || audience !== "ALL" || contentType !== "ALL" ? "No content matches the current filters." : "No marketing content yet."}</p>
            </div>
          ) : (
            <div className="inline-grid">
              {filtered.map((item) => (
                <section key={item.id} className="card">
                  <div className="card-header">
                    <div>
                      <h3>{item.title}</h3>
                      <p className="help">{item.contentType} · {item.audience || "Unspecified audience"} · {item.serviceLine || "Unspecified service"}</p>
                    </div>
                    <span className="badge">{item.channel || "Library"}</span>
                  </div>
                  <MarketingContentForm content={item} onSaved={upsertItem} onDeleted={removeItem} />
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
