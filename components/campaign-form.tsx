"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { MarketingAiStudio } from "@/components/marketing-ai-studio";

type SegmentOption = {
  id: string;
  name: string;
  entityType: string;
};

type MarketingContentOption = {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  channel: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  callToAction: string | null;
  imageUrl: string | null;
};

type CampaignDraftSeed = {
  name?: string;
  subject?: string;
  templateHtml?: string;
  templateText?: string;
  marketingContentId?: string;
};

type PreviewState = {
  count: number;
  eligibleCount: number;
  sample: Array<{
    id: string;
    fullName: string | null;
    email: string | null;
    company?: { name: string | null } | null;
  }>;
} | null;

export function CampaignForm({
  segments,
  defaults,
  marketingContent,
  draftSeed,
  onDraftApplied,
  showAiAssist = false,
}: {
  segments: SegmentOption[];
  defaults: { fromName: string; fromEmail: string; replyTo: string };
  marketingContent: MarketingContentOption[];
  draftSeed?: CampaignDraftSeed | null;
  onDraftApplied?: () => void;
  showAiAssist?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const sendableSegments = segments.filter((segment) => segment.entityType === "contact");
  const unavailableSegments = segments.filter((segment) => segment.entityType !== "contact");
  const [selectedSegmentId, setSelectedSegmentId] = useState(sendableSegments[0]?.id || "");
  const [selectedMarketingContentId, setSelectedMarketingContentId] = useState("");
  const [preview, setPreview] = useState<PreviewState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selectedSegment = sendableSegments.find((segment) => segment.id === selectedSegmentId) || null;
  const selectedMarketingContent = marketingContent.find((item) => item.id === selectedMarketingContentId) || null;
  const libraryEmailAssets = marketingContent.filter((item) => item.contentType === "Email copy").length;

  async function previewAudience() {
    if (!selectedSegmentId) {
      setMessage("Choose a segment first.");
      return;
    }

    setPending(true);
    setMessage(null);

    const response = await fetch(`/api/campaigns/preview?segmentId=${selectedSegmentId}`);
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(body.error || "Failed to preview campaign audience.");
      setPending(false);
      return;
    }

    setPreview({ count: body.count, eligibleCount: body.eligibleCount ?? body.count, sample: body.sample });
    setPending(false);
  }

  function applyMarketingContent(contentId: string) {
    setSelectedMarketingContentId(contentId);

    const content = marketingContent.find((item) => item.id === contentId);
    if (!content || !formRef.current) {
      return;
    }

    const subjectInput = formRef.current.elements.namedItem("subject") as HTMLInputElement | null;
    const htmlInput = formRef.current.elements.namedItem("templateHtml") as HTMLTextAreaElement | null;
    const textInput = formRef.current.elements.namedItem("templateText") as HTMLTextAreaElement | null;

    if (subjectInput) {
      subjectInput.value = content.callToAction?.trim() || content.title;
    }

    if (htmlInput) {
      const imageBlock = content.imageUrl
        ? `<p><img src="${content.imageUrl}" alt="${content.title}" style="max-width:100%;height:auto;border-radius:12px;" /></p>`
        : "";
      const htmlBody = content.bodyHtml?.trim() || (content.bodyText?.trim() ? `<p>${content.bodyText.replace(/\n/g, "</p><p>")}</p>` : "");
      htmlInput.value = [imageBlock, htmlBody].filter(Boolean).join("\n\n");
    }

    if (textInput) {
      const textParts = [content.description?.trim() || "", content.bodyText?.trim() || "", content.imageUrl ? `Image: ${content.imageUrl}` : ""]
        .filter(Boolean);
      textInput.value = textParts.join("\n\n");
    }
  }

  useEffect(() => {
    if (!draftSeed || !formRef.current) {
      return;
    }

    const nameInput = formRef.current.elements.namedItem("name") as HTMLInputElement | null;
    const subjectInput = formRef.current.elements.namedItem("subject") as HTMLInputElement | null;
    const htmlInput = formRef.current.elements.namedItem("templateHtml") as HTMLTextAreaElement | null;
    const textInput = formRef.current.elements.namedItem("templateText") as HTMLTextAreaElement | null;

    if (nameInput && draftSeed.name) nameInput.value = draftSeed.name;
    if (subjectInput && draftSeed.subject) subjectInput.value = draftSeed.subject;
    if (htmlInput && draftSeed.templateHtml) htmlInput.value = draftSeed.templateHtml;
    if (textInput && draftSeed.templateText) textInput.value = draftSeed.templateText;
    if (draftSeed.marketingContentId) {
      applyMarketingContent(draftSeed.marketingContentId);
    }

    onDraftApplied?.();
  }, [draftSeed, onDraftApplied]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || ""),
      subject: String(form.get("subject") || ""),
      fromName: String(form.get("fromName") || "") || null,
      fromEmail: String(form.get("fromEmail") || "") || null,
      replyTo: String(form.get("replyTo") || "") || null,
      templateHtml: String(form.get("templateHtml") || ""),
      templateText: String(form.get("templateText") || "") || null,
      segmentId: selectedSegmentId || null,
      status: String(form.get("status") || "DRAFT"),
      scheduledAt: (() => {
        const raw = String(form.get("scheduledAt") || "").trim();
        if (!raw) {
          return null;
        }

        const localDate = new Date(raw);
        if (Number.isNaN(localDate.getTime())) {
          return raw;
        }

        return localDate.toISOString();
      })(),
    };

    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to create campaign.");
      setPending(false);
      return;
    }

    formRef.current?.reset();
    setSelectedSegmentId("");
    setSelectedMarketingContentId("");
    setPreview(null);
    setMessage("Campaign created. Refresh to see it in the table.");
    setPending(false);
  }

  const hasSegments = sendableSegments.length > 0;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="inline-grid">
      {!hasSegments ? <p className="help">Create a contact segment first so this campaign has a sendable audience.</p> : null}

      <div className="card subtle-card">
        <div className="record-summary-main">
          <div className="record-summary-topline">
            <h3>Send Setup</h3>
            {selectedSegment ? <span className="badge badge-blue">{selectedSegment.name}</span> : null}
          </div>
          <div className="record-meta-row">
            <span>{selectedSegment ? "Contact segment selected" : "No segment selected"}</span>
            <span>{selectedMarketingContent ? `Using library asset: ${selectedMarketingContent.title}` : "No library asset applied"}</span>
            <span>{defaults.fromEmail || "No default sender configured"}</span>
            <span>{libraryEmailAssets} reusable email assets in library</span>
          </div>
        </div>
      </div>

      {showAiAssist ? (
        <div className="card subtle-card">
          <div className="card-header dashboard-panel-header">
            <div>
              <h3>AI Assist</h3>
              <p className="help">Generate campaign-ready copy here, then drop it straight into this draft form.</p>
            </div>
          </div>
          <MarketingAiStudio
            segments={segments}
            onUseCampaignDraft={(draft) => {
              if (!draftSeed && formRef.current) {
                const nameInput = formRef.current.elements.namedItem("name") as HTMLInputElement | null;
                const subjectInput = formRef.current.elements.namedItem("subject") as HTMLInputElement | null;
                const htmlInput = formRef.current.elements.namedItem("templateHtml") as HTMLTextAreaElement | null;
                const textInput = formRef.current.elements.namedItem("templateText") as HTMLTextAreaElement | null;

                if (nameInput && draft.name) nameInput.value = draft.name;
                if (subjectInput && draft.subject) subjectInput.value = draft.subject;
                if (htmlInput && draft.templateHtml) htmlInput.value = draft.templateHtml;
                if (textInput && draft.templateText) textInput.value = draft.templateText;
              }
            }}
          />
        </div>
      ) : null}

      <div className="card subtle-card">
        <h3>Operator Guidance</h3>
        <div className="inline-grid">
          <div className="dashboard-list-row">
            <div className="record-summary-main">
              <strong>Use contact segments only</strong>
              <p className="help">Campaign sending still targets contacts, not companies or prospects directly.</p>
            </div>
          </div>
          <div className="dashboard-list-row">
            <div className="record-summary-main">
              <strong>Preview before scheduling</strong>
              <p className="help">Check the audience sample before you lock a campaign into scheduled send mode.</p>
            </div>
          </div>
          <div className="dashboard-list-row">
            <div className="record-summary-main">
              <strong>Prefer library-backed drafts</strong>
              <p className="help">Start from reusable content when possible so messaging stays consistent across acquisition and upsell campaigns.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="campaign-marketing-content">Marketing content</label>
          <select
            id="campaign-marketing-content"
            value={selectedMarketingContentId}
            onChange={(event) => applyMarketingContent(event.target.value)}
          >
            <option value="">No library content selected</option>
            {marketingContent.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} ({item.contentType}{item.channel ? ` · ${item.channel}` : ""})
              </option>
            ))}
          </select>
          <p className="help">Selecting a library item preloads the campaign subject and body if those fields are still empty.</p>
        </div>
        <div className="field">
          <label htmlFor="campaign-name">Campaign name</label>
          <input id="campaign-name" name="name" placeholder="Texas Vet Intro" required />
        </div>
        <div className="field">
          <label htmlFor="campaign-subject">Subject</label>
          <input id="campaign-subject" name="subject" placeholder="Helping independent clinics tighten outreach" required />
        </div>
        <div className="field">
          <label htmlFor="campaign-segment">Segment</label>
          <select id="campaign-segment" value={selectedSegmentId} onChange={(event) => setSelectedSegmentId(event.target.value)}>
            <option value="">No segment selected</option>
            {sendableSegments.length > 0 ? (
              <optgroup label="Sendable contact segments">
                {sendableSegments.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {unavailableSegments.length > 0 ? (
              <optgroup label="Unavailable for campaigns right now">
                {unavailableSegments.map((segment) => (
                  <option key={segment.id} value={segment.id} disabled>
                    {segment.name} ({segment.entityType})
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
          <p className="help">Campaign sending currently supports contact segments only.</p>
        </div>
        <div className="field">
          <label htmlFor="campaign-status">Status</label>
          <select id="campaign-status" name="status" defaultValue="DRAFT">
            <option value="DRAFT">DRAFT</option>
            <option value="SCHEDULED">SCHEDULED</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="campaign-from-name">From name</label>
          <input id="campaign-from-name" name="fromName" defaultValue={defaults.fromName} />
        </div>
        <div className="field">
          <label htmlFor="campaign-from-email">From email</label>
          <input id="campaign-from-email" name="fromEmail" type="email" defaultValue={defaults.fromEmail} required />
        </div>
        <div className="field">
          <label htmlFor="campaign-reply-to">Reply-to</label>
          <input id="campaign-reply-to" name="replyTo" type="email" defaultValue={defaults.replyTo} placeholder="replies@example.com" />
        </div>
        <div className="field">
          <label htmlFor="campaign-scheduled-at">Scheduled at</label>
          <input id="campaign-scheduled-at" name="scheduledAt" type="datetime-local" />
          <p className="help">Time is captured from your browser timezone and stored in UTC.</p>
        </div>
      </div>
      <div className="field">
        <label htmlFor="campaign-template-html">HTML body</label>
        <textarea
          id="campaign-template-html"
          name="templateHtml"
          defaultValue="<p>Hi {{first_name}},</p><p>We help practices improve outreach operations.</p>"
        />
      </div>
      <div className="field">
        <label htmlFor="campaign-template-text">Plain-text body</label>
        <textarea
          id="campaign-template-text"
          name="templateText"
          defaultValue="Hi {{first_name}},\n\nWe help practices improve outreach operations."
        />
      </div>
      <div className="actions">
        <button className="button secondary" type="button" onClick={previewAudience} disabled={pending || !hasSegments}>
          {pending ? "Previewing..." : "Preview Audience"}
        </button>
        <button className="button primary" type="submit" disabled={pending || !hasSegments}>
          {pending ? "Saving..." : "Create Campaign"}
        </button>
        {message ? <span className="help">{message}</span> : null}
      </div>
      {preview ? (
        <div className="card">
          <div className="record-summary-main">
            <div className="record-summary-topline">
              <h3>Audience Preview</h3>
              <span className="badge badge-blue">{preview.count} total</span>
              <span className={`badge ${preview.eligibleCount > 0 ? "badge-green" : "badge-red"}`}>{preview.eligibleCount} eligible</span>
            </div>
            <p>{preview.count} matching contacts, with {preview.eligibleCount} currently eligible to send after status and suppression checks.</p>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
              </tr>
            </thead>
            <tbody>
              {preview.sample.map((item) => (
                <tr key={item.id}>
                  <td>{item.fullName || "Unnamed"}</td>
                  <td>{item.email || "No email"}</td>
                  <td>{item.company?.name || "Unlinked"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </form>
  );
}
