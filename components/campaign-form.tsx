"use client";

import { FormEvent, useRef, useState } from "react";

type SegmentOption = {
  id: string;
  name: string;
  entityType: string;
};

type PreviewState = {
  count: number;
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
}: {
  segments: SegmentOption[];
  defaults: { fromName: string; fromEmail: string; replyTo: string };
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState(segments[0]?.id || "");
  const [preview, setPreview] = useState<PreviewState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

    setPreview({ count: body.count, sample: body.sample });
    setPending(false);
  }

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
    setPreview(null);
    setMessage("Campaign created. Refresh to see it in the table.");
    setPending(false);
  }

  const hasSegments = segments.length > 0;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="inline-grid">
      {!hasSegments ? <p className="help">Create a segment first so this campaign has an audience.</p> : null}

      <div className="form-grid">
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
            {segments.map((segment) => (
              <option key={segment.id} value={segment.id}>
                {segment.name} ({segment.entityType})
              </option>
            ))}
          </select>
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
          <h3>Audience Preview</h3>
          <p>{preview.count} matching contacts with current filters.</p>
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
