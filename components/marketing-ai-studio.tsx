"use client";

import { FormEvent, useState } from "react";
import { CustomFieldsEditor } from "@/components/custom-fields-editor";
import type { MarketingContent } from "@prisma/client";

type GeneratedAsset = {
  headline?: string;
  subheadline?: string;
  bodyText?: string;
  callToAction?: string;
  imagePrompt?: string;
  imageUrl?: string | null;
  tags?: string[];
  taxonomy?: string[];
};

type SavedMarketingContent = MarketingContent;

const promptTemplates = [
  { key: "", label: "Auto-select template" },
  { key: "veterinary-phones", label: "Veterinary clinics · Phones" },
  { key: "veterinary-internet", label: "Veterinary clinics · Internet" },
  { key: "medical-phones", label: "Private medical practices · Phones" },
  { key: "medical-internet", label: "Private medical practices · Internet" },
];

export function MarketingAiStudio({ onUseDraft, onSaved }: { onUseDraft?: (draft: GeneratedAsset & Record<string, unknown>) => void; onSaved?: (item: SavedMarketingContent) => void }) {
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedAsset | null>(null);
  const [variables, setVariables] = useState<Array<{ id: string; key: string; value: string }>>([]);
  const [generateImage, setGenerateImage] = useState(true);

  async function saveResultToLibrary() {
    if (!result) return;

    setSaving(true);
    setMessage(null);

    const payload = {
      title: result.headline || "AI marketing draft",
      description: result.subheadline || null,
      contentType: "Flier",
      imagePrompt: result.imagePrompt || null,
      imageUrl: result.imageUrl || null,
      callToAction: result.callToAction || null,
      bodyText: result.bodyText || null,
      tags: Array.isArray(result.tags) ? result.tags : [],
      taxonomy: Array.isArray(result.taxonomy) ? result.taxonomy : [],
      variables: variables.map(({ key, value }) => ({ key, value })),
    };

    const response = await fetch("/api/marketing-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to save generated draft.");
      setSaving(false);
      return;
    }

    onSaved?.(body.data);
    setMessage("Generated draft saved to the library.");
    setSaving(false);
  }

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
      industry: String(form.get("industry") || "") || null,
      offerType: String(form.get("offerType") || "") || null,
      assetFormat: String(form.get("assetFormat") || "") || null,
      tone: String(form.get("tone") || "") || null,
      lifecycleStage: String(form.get("lifecycleStage") || "") || null,
      description: String(form.get("description") || "") || null,
      promptNotes: String(form.get("promptNotes") || "") || null,
      promptTemplateKey: String(form.get("promptTemplateKey") || "") || null,
      generateImage,
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
            <label htmlFor="ai-template">Prompt template</label>
            <select id="ai-template" name="promptTemplateKey" defaultValue="">
              {promptTemplates.map((template) => <option key={template.key} value={template.key}>{template.label}</option>)}
            </select>
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
          <div className="field">
            <label htmlFor="ai-industry">Industry</label>
            <input id="ai-industry" name="industry" placeholder="Healthcare" />
          </div>
          <div className="field">
            <label htmlFor="ai-offer-type">Offer type</label>
            <input id="ai-offer-type" name="offerType" placeholder="Bundle offer" />
          </div>
          <div className="field">
            <label htmlFor="ai-asset-format">Asset format</label>
            <input id="ai-asset-format" name="assetFormat" placeholder="Half-page flyer" />
          </div>
          <div className="field">
            <label htmlFor="ai-tone">Tone</label>
            <input id="ai-tone" name="tone" placeholder="Practical and reassuring" />
          </div>
          <div className="field">
            <label htmlFor="ai-lifecycle-stage">Lifecycle stage</label>
            <input id="ai-lifecycle-stage" name="lifecycleStage" placeholder="Awareness" />
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
          <label className="help" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={generateImage} onChange={(event) => setGenerateImage(event.target.checked)} />
            Generate image draft too
          </label>
        </div>
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
            {result.imageUrl ? (
              <div>
                <strong>Generated image</strong>
                <div style={{ marginTop: 12 }}>
                  <img src={result.imageUrl} alt="Generated marketing draft" style={{ maxWidth: "100%", borderRadius: 12, border: "1px solid var(--line)" }} />
                </div>
              </div>
            ) : null}
            <div>
              <strong>Suggested tags</strong>
              <p>{result.tags?.join(", ") || "—"}</p>
            </div>
            <div>
              <strong>Suggested taxonomy</strong>
              <p>{result.taxonomy?.join(", ") || "—"}</p>
            </div>
          </div>
          <div className="actions">
            {onUseDraft ? (
              <button className="button secondary" type="button" onClick={() => onUseDraft(result)}>
                Use Draft in Library Form
              </button>
            ) : null}
            <button className="button primary" type="button" disabled={saving} onClick={() => void saveResultToLibrary()}>
              {saving ? "Saving..." : "Save Draft to Library"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
