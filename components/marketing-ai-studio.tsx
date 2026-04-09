"use client";

import { FormEvent, useState } from "react";
import { CustomFieldsEditor } from "@/components/custom-fields-editor";

type GeneratedAsset = {
  headline?: string;
  subheadline?: string;
  bodyText?: string;
  callToAction?: string;
  imagePrompt?: string;
  tags?: string[];
};

export function MarketingAiStudio({ onUseDraft }: { onUseDraft?: (draft: GeneratedAsset & Record<string, unknown>) => void }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedAsset | null>(null);
  const [variables, setVariables] = useState<Array<{ id: string; key: string; value: string }>>([]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setResult(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") || ""),
      contentType: String(form.get("contentType") || "Flier"),
      audience: String(form.get("audience") || "") || null,
      serviceLine: String(form.get("serviceLine") || "") || null,
      channel: String(form.get("channel") || "") || null,
      description: String(form.get("description") || "") || null,
      promptNotes: String(form.get("promptNotes") || "") || null,
      variables: variables.map(({ key, value }) => ({ key, value })),
    };

    const response = await fetch("/api/marketing-content/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to generate content.");
      setPending(false);
      return;
    }

    setResult(body.data);
    setPending(false);
  }

  return (
    <div className="inline-grid">
      <form onSubmit={onSubmit} className="inline-grid">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="ai-title">Asset title</label>
            <input id="ai-title" name="title" placeholder="Veterinary phones & internet flyer" required />
          </div>
          <div className="field">
            <label htmlFor="ai-content-type">Content type</label>
            <select id="ai-content-type" name="contentType" defaultValue="Flier">
              <option value="Flier">Flier</option>
              <option value="One-pager">One-pager</option>
              <option value="Email copy">Email copy</option>
              <option value="Landing page">Landing page</option>
              <option value="Social post">Social post</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="ai-audience">Audience</label>
            <input id="ai-audience" name="audience" placeholder="Veterinary clinics" />
          </div>
          <div className="field">
            <label htmlFor="ai-service-line">Service line</label>
            <input id="ai-service-line" name="serviceLine" placeholder="Phones" />
          </div>
          <div className="field">
            <label htmlFor="ai-channel">Channel</label>
            <input id="ai-channel" name="channel" placeholder="Print" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ai-description">Description</label>
          <textarea id="ai-description" name="description" placeholder="What should this piece accomplish?" />
        </div>
        <div className="field">
          <label htmlFor="ai-prompt-notes">Prompt notes</label>
          <textarea id="ai-prompt-notes" name="promptNotes" placeholder="Tone, positioning, offers, proof points, image direction, etc." />
        </div>
        <CustomFieldsEditor entity="ai-variable" fields={variables} onChange={setVariables} />
        <div className="actions">
          <button className="button primary" type="submit" disabled={pending}>{pending ? "Generating..." : "Generate with ChatGPT"}</button>
          {message ? <span className="help">{message}</span> : null}
        </div>
      </form>

      {result ? (
        <div className="card">
          <h3>Generated Draft</h3>
          <div className="inline-grid">
            <p><strong>Headline:</strong> {result.headline || "—"}</p>
            <p><strong>Subheadline:</strong> {result.subheadline || "—"}</p>
            <p><strong>Call to action:</strong> {result.callToAction || "—"}</p>
            <div>
              <strong>Body copy</strong>
              <p>{result.bodyText || "—"}</p>
            </div>
            <div>
              <strong>Image prompt</strong>
              <p>{result.imagePrompt || "—"}</p>
            </div>
            <div>
              <strong>Suggested tags</strong>
              <p>{result.tags?.join(", ") || "—"}</p>
            </div>
          </div>
          {onUseDraft ? (
            <div className="actions">
              <button className="button secondary" type="button" onClick={() => onUseDraft(result)}>
                Use Draft in Library Form
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
