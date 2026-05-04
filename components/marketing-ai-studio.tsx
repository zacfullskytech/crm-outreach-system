"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { CustomFieldsEditor } from "@/components/custom-fields-editor";
import { plainTextToEmailHtml } from "@/lib/email";
import type { MarketingContent, Segment } from "@prisma/client";

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
type SegmentOption = Pick<Segment, "id" | "name" | "entityType">;

type DraftState = {
  headline: string;
  subheadline: string;
  bodyText: string;
  callToAction: string;
  imagePrompt: string;
  imageUrl: string;
  tagsInput: string;
  taxonomyInput: string;
};

type GeneratorState = {
  title: string;
  contentType: string;
  audience: string;
  serviceLine: string;
  channel: string;
  industry: string;
  offerType: string;
  assetFormat: string;
  tone: string;
  lifecycleStage: string;
  description: string;
  promptNotes: string;
  promptTemplateKey: string;
};

const promptTemplates = [
  { key: "", label: "Auto-select template" },
  { key: "veterinary-phones", label: "Veterinary clinics · Phones" },
  { key: "veterinary-internet", label: "Veterinary clinics · Internet" },
  { key: "medical-phones", label: "Private medical practices · Phones" },
  { key: "medical-internet", label: "Private medical practices · Internet" },
];

const initialGeneratorState: GeneratorState = {
  title: "",
  contentType: "Flier",
  audience: "",
  serviceLine: "",
  channel: "",
  industry: "",
  offerType: "",
  assetFormat: "",
  tone: "",
  lifecycleStage: "",
  description: "",
  promptNotes: "",
  promptTemplateKey: "",
};

function toDraftState(asset?: GeneratedAsset | null): DraftState {
  return {
    headline: asset?.headline || "",
    subheadline: asset?.subheadline || "",
    bodyText: asset?.bodyText || "",
    callToAction: asset?.callToAction || "",
    imagePrompt: asset?.imagePrompt || "",
    imageUrl: asset?.imageUrl || "",
    tagsInput: asset?.tags?.join(", ") || "",
    taxonomyInput: asset?.taxonomy?.join(", ") || "",
  };
}

function splitCommaList(value: string) {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

export function MarketingAiStudio({
  onUseDraft,
  onUseCampaignDraft,
  onSaved,
  segments = [],
}: {
  onUseDraft?: (draft: GeneratedAsset & Record<string, unknown>) => void;
  onUseCampaignDraft?: (draft: { name?: string; subject?: string; templateHtml?: string; templateText?: string }) => void;
  onSaved?: (item: SavedMarketingContent) => void;
  segments?: SegmentOption[];
}) {
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revising, setRevising] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedAsset | null>(null);
  const [draft, setDraft] = useState<DraftState>(toDraftState());
  const [generator, setGenerator] = useState<GeneratorState>(initialGeneratorState);
  const [variables, setVariables] = useState<Array<{ id: string; key: string; value: string }>>([]);
  const [generateImage, setGenerateImage] = useState(true);
  const [selectedSegmentId, setSelectedSegmentId] = useState(segments[0]?.id || "");
  const [revisionNotes, setRevisionNotes] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const selectedSegment = segments.find((segment) => segment.id === selectedSegmentId) || null;

  const currentDraft = useMemo<GeneratedAsset>(() => ({
    headline: draft.headline || undefined,
    subheadline: draft.subheadline || undefined,
    bodyText: draft.bodyText || undefined,
    callToAction: draft.callToAction || undefined,
    imagePrompt: draft.imagePrompt || undefined,
    imageUrl: draft.imageUrl || null,
    tags: splitCommaList(draft.tagsInput),
    taxonomy: splitCommaList(draft.taxonomyInput),
  }), [draft]);

  function updateDraft<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateGenerator<K extends keyof GeneratorState>(key: K, value: GeneratorState[K]) {
    setGenerator((current) => ({ ...current, [key]: value }));
  }

  function applyGeneratedResult(asset: GeneratedAsset, nextImageUrl?: string | null) {
    const normalized = { ...asset, imageUrl: nextImageUrl ?? asset.imageUrl ?? null };
    setResult(normalized);
    setDraft(toDraftState(normalized));
  }

  async function saveResultToLibrary() {
    if (!draft.headline && !draft.bodyText) return;

    setSaving(true);
    setMessage(null);

    const payload = {
      title: draft.headline || generator.title || "AI marketing draft",
      description: draft.subheadline || generator.description || null,
      contentType: generator.contentType || "Flier",
      serviceLine: generator.serviceLine || null,
      audience: generator.audience || null,
      channel: generator.channel || null,
      industry: generator.industry || null,
      offerType: generator.offerType || null,
      assetFormat: generator.assetFormat || null,
      tone: generator.tone || null,
      lifecycleStage: generator.lifecycleStage || null,
      imagePrompt: draft.imagePrompt || null,
      imageUrl: draft.imageUrl || null,
      callToAction: draft.callToAction || null,
      bodyText: draft.bodyText || null,
      promptNotes: generator.promptNotes || null,
      promptTemplateKey: generator.promptTemplateKey || null,
      tags: splitCommaList(draft.tagsInput),
      taxonomy: splitCommaList(draft.taxonomyInput),
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

  async function runGeneration(mode: "generate" | "revise") {
    if (mode === "revise" && !result) return;
    if (!formRef.current) return;

    if (mode === "generate") {
      setPending(true);
      setResult(null);
      setDraft(toDraftState());
    } else {
      setRevising(true);
    }
    setMessage(null);

    const payload = {
      title: generator.title,
      contentType: generator.contentType,
      audience: generator.audience || null,
      serviceLine: generator.serviceLine || null,
      channel: generator.channel || null,
      industry: generator.industry || null,
      offerType: generator.offerType || null,
      assetFormat: generator.assetFormat || null,
      tone: generator.tone || null,
      lifecycleStage: generator.lifecycleStage || null,
      description: generator.description || null,
      promptNotes: generator.promptNotes || null,
      promptTemplateKey: generator.promptTemplateKey || null,
      segmentId: selectedSegmentId || null,
      generateImage,
      variables: variables.map(({ key, value }) => ({ key, value })),
      existingDraft: mode === "revise" ? currentDraft : null,
      revisionNotes: mode === "revise" ? revisionNotes || null : null,
    };

    const response = await fetch("/api/marketing-content/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || `Failed to ${mode} content.`);
      setPending(false);
      setRevising(false);
      return;
    }

    applyGeneratedResult(body.data, body.data?.imageUrl ?? null);
    setPending(false);
    setRevising(false);
    if (mode === "revise") {
      setMessage("Draft revised.");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runGeneration("generate");
  }

  return (
    <div className="inline-grid">
      <form ref={formRef} onSubmit={handleSubmit} className="inline-grid">
        <div className="card subtle-card">
          <div className="record-summary-main">
            <div className="record-summary-topline">
              <h3>Generation Setup</h3>
              {selectedSegment ? <span className="badge badge-blue">{selectedSegment.name}</span> : null}
            </div>
            <div className="record-meta-row">
              <span>{selectedSegment ? `${selectedSegment.entityType} segment context applied` : "No segment context applied"}</span>
              <span>{generateImage ? "Image generation on" : "Copy only"}</span>
              <span>{variables.length} variable{variables.length === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="ai-title">Asset title</label>
            <input id="ai-title" name="title" value={generator.title} onChange={(event) => updateGenerator("title", event.target.value)} placeholder="Veterinary phones & internet flyer" required />
          </div>
          <div className="field">
            <label htmlFor="ai-segment">Segment</label>
            <select id="ai-segment" value={selectedSegmentId} onChange={(event) => setSelectedSegmentId(event.target.value)}>
              <option value="">No segment selected</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>{segment.name} ({segment.entityType})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ai-template">Prompt template</label>
            <select id="ai-template" name="promptTemplateKey" value={generator.promptTemplateKey} onChange={(event) => updateGenerator("promptTemplateKey", event.target.value)}>
              {promptTemplates.map((template) => <option key={template.key} value={template.key}>{template.label}</option>)}</select>
          </div>
          <div className="field">
            <label htmlFor="ai-content-type">Content type</label>
            <select id="ai-content-type" name="contentType" value={generator.contentType} onChange={(event) => updateGenerator("contentType", event.target.value)}>
              <option value="Flier">Flier</option>
              <option value="One-pager">One-pager</option>
              <option value="Email copy">Email copy</option>
              <option value="Landing page">Landing page</option>
              <option value="Social post">Social post</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="ai-audience">Audience</label>
            <input id="ai-audience" name="audience" value={generator.audience} onChange={(event) => updateGenerator("audience", event.target.value)} placeholder="Veterinary clinics" />
          </div>
          <div className="field">
            <label htmlFor="ai-service-line">Service line</label>
            <input id="ai-service-line" name="serviceLine" value={generator.serviceLine} onChange={(event) => updateGenerator("serviceLine", event.target.value)} placeholder="Phones" />
          </div>
          <div className="field">
            <label htmlFor="ai-channel">Channel</label>
            <input id="ai-channel" name="channel" value={generator.channel} onChange={(event) => updateGenerator("channel", event.target.value)} placeholder="Print" />
          </div>
          <div className="field">
            <label htmlFor="ai-industry">Industry</label>
            <input id="ai-industry" name="industry" value={generator.industry} onChange={(event) => updateGenerator("industry", event.target.value)} placeholder="Healthcare" />
          </div>
          <div className="field">
            <label htmlFor="ai-offer-type">Offer type</label>
            <input id="ai-offer-type" name="offerType" value={generator.offerType} onChange={(event) => updateGenerator("offerType", event.target.value)} placeholder="Bundle offer" />
          </div>
          <div className="field">
            <label htmlFor="ai-asset-format">Asset format</label>
            <input id="ai-asset-format" name="assetFormat" value={generator.assetFormat} onChange={(event) => updateGenerator("assetFormat", event.target.value)} placeholder="Half-page flyer" />
          </div>
          <div className="field">
            <label htmlFor="ai-tone">Tone</label>
            <input id="ai-tone" name="tone" value={generator.tone} onChange={(event) => updateGenerator("tone", event.target.value)} placeholder="Practical and reassuring" />
          </div>
          <div className="field">
            <label htmlFor="ai-lifecycle-stage">Lifecycle stage</label>
            <input id="ai-lifecycle-stage" name="lifecycleStage" value={generator.lifecycleStage} onChange={(event) => updateGenerator("lifecycleStage", event.target.value)} placeholder="Awareness" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ai-description">Description</label>
          <textarea id="ai-description" name="description" value={generator.description} onChange={(event) => updateGenerator("description", event.target.value)} placeholder="What should this piece accomplish?" />
        </div>
        <div className="field">
          <label htmlFor="ai-prompt-notes">Prompt notes</label>
          <textarea id="ai-prompt-notes" name="promptNotes" value={generator.promptNotes} onChange={(event) => updateGenerator("promptNotes", event.target.value)} placeholder="Tone, positioning, offers, proof points, image direction, etc." />
        </div>
        <CustomFieldsEditor entity="ai-variable" fields={variables} onChange={setVariables} />
        <div className="actions">
          <label className="help" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={generateImage} onChange={(event) => setGenerateImage(event.target.checked)} />
            Generate image draft too
          </label>
        </div>
        <div className="actions">
          <button className="button primary" type="submit" disabled={pending || revising || saving}>{pending ? "Generating..." : "Generate with ChatGPT"}</button>
          {message ? <span className="help">{message}</span> : null}
        </div>

        {result ? (
          <div className="card ai-result-card">
            <h3>Generated Draft</h3>
            <div className="inline-grid ai-result-grid">
              <div className="field">
                <label htmlFor="ai-draft-headline">Headline</label>
                <input id="ai-draft-headline" value={draft.headline} onChange={(event) => updateDraft("headline", event.target.value)} placeholder="Headline" />
              </div>
              <div className="field">
                <label htmlFor="ai-draft-subheadline">Subheadline</label>
                <input id="ai-draft-subheadline" value={draft.subheadline} onChange={(event) => updateDraft("subheadline", event.target.value)} placeholder="Subheadline" />
              </div>
              <div className="field">
                <label htmlFor="ai-draft-cta">Call to action</label>
                <input id="ai-draft-cta" value={draft.callToAction} onChange={(event) => updateDraft("callToAction", event.target.value)} placeholder="Call to action" />
              </div>
              <div className="field">
                <label htmlFor="ai-draft-tags">Suggested tags</label>
                <input id="ai-draft-tags" value={draft.tagsInput} onChange={(event) => updateDraft("tagsInput", event.target.value)} placeholder="tag one, tag two" />
              </div>
              <div className="field">
                <label htmlFor="ai-draft-taxonomy">Suggested taxonomy</label>
                <input id="ai-draft-taxonomy" value={draft.taxonomyInput} onChange={(event) => updateDraft("taxonomyInput", event.target.value)} placeholder="taxonomy one, taxonomy two" />
              </div>
              <div className="field">
                <label htmlFor="ai-draft-body">Body copy</label>
                <textarea id="ai-draft-body" value={draft.bodyText} onChange={(event) => updateDraft("bodyText", event.target.value)} placeholder="Body copy" />
              </div>
              <div className="field">
                <label htmlFor="ai-draft-image-prompt">Image prompt</label>
                <textarea id="ai-draft-image-prompt" value={draft.imagePrompt} onChange={(event) => updateDraft("imagePrompt", event.target.value)} placeholder="Image prompt" />
              </div>
              <div className="field">
                <label htmlFor="ai-draft-image-url">Image URL</label>
                <textarea id="ai-draft-image-url" value={draft.imageUrl} onChange={(event) => updateDraft("imageUrl", event.target.value)} placeholder="Generated image URL" />
              </div>
              {draft.imageUrl ? (
                <div>
                  <strong>Generated image</strong>
                  <div style={{ marginTop: 12 }}>
                    <img src={draft.imageUrl} alt="Generated marketing draft" style={{ maxWidth: "100%", borderRadius: 12, border: "1px solid var(--line)" }} />
                  </div>
                </div>
              ) : null}
              <div className="field">
                <label htmlFor="ai-revision-notes">Revision notes</label>
                <textarea id="ai-revision-notes" value={revisionNotes} onChange={(event) => setRevisionNotes(event.target.value)} placeholder="Make it shorter, less salesy, and more focused on reliability for front-desk staff." />
              </div>
            </div>
            <div className="actions">
              <button className="button secondary" type="button" disabled={revising || pending || saving || !revisionNotes.trim()} onClick={() => void runGeneration("revise")}>
                {revising ? "Revising..." : "Revise Draft"}
              </button>
              {onUseDraft ? (
                <button className="button secondary" type="button" onClick={() => onUseDraft(currentDraft)}>
                  Use Draft in Library Form
                </button>
              ) : null}
              {onUseCampaignDraft ? (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => onUseCampaignDraft({
                    name: currentDraft.headline || "AI Campaign Draft",
                    subject: currentDraft.callToAction || currentDraft.headline || "AI Campaign Draft",
                    templateHtml: [
                      currentDraft.bodyText ? plainTextToEmailHtml(currentDraft.bodyText) : "",
                      currentDraft.imageUrl ? `<p><img src="${currentDraft.imageUrl}" alt="${currentDraft.headline || "Generated campaign image"}" style="max-width:100%;height:auto;border-radius:12px;" /></p>` : "",
                    ]
                      .filter(Boolean)
                      .join("\n\n"),
                    templateText: [currentDraft.bodyText || "", currentDraft.imageUrl ? `Image: ${currentDraft.imageUrl}` : ""].filter(Boolean).join("\n\n"),
                  })}
                >
                  Use Draft in Campaigns
                </button>
              ) : null}
              <button className="button primary" type="button" disabled={saving || pending || revising} onClick={() => void saveResultToLibrary()}>
                {saving ? "Saving..." : "Save Draft to Library"}
              </button>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
