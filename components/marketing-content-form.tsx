"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CustomFieldsEditor } from "@/components/custom-fields-editor";
import { customFieldsToPairs } from "@/lib/custom-fields";
import type { MarketingContent } from "@prisma/client";

type MarketingContentRecord = MarketingContent;

const contentTypes = ["Flier", "One-pager", "Email copy", "Landing page", "Social post", "Offer sheet", "Case study"];
const serviceLineOptions = ["Phones", "Internet", "Cybersecurity", "Managed IT", "VoIP", "Connectivity"];
const audienceOptions = ["Veterinary clinics", "Private medical practices", "Dental offices", "Retail", "SMB"];
const channelOptions = ["Print", "Email", "Web", "Sales handout", "Social", "Internal"];
const industryOptions = ["Veterinary", "Medical", "Dental", "Retail", "SMB"];
const offerTypeOptions = ["Bundle offer", "Promotional campaign", "Feature spotlight", "Switcher campaign", "Awareness"];
const assetFormatOptions = ["Full-page flyer", "Half-page flyer", "Email sequence", "Landing page", "Ad creative"];
const toneOptions = ["Practical", "Reassuring", "Professional", "Direct", "Friendly"];
const lifecycleStageOptions = ["Awareness", "Consideration", "Conversion", "Retention"];

function toCommaList(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)).join(", ") : "";
}

export function MarketingContentForm({
  content,
  onSaved,
  onDeleted,
  submitLabel = "Save Content",
  draftSeed,
  onDraftApplied,
}: {
  content?: MarketingContentRecord;
  onSaved?: (content: MarketingContentRecord) => void;
  onDeleted?: (id: string) => void;
  submitLabel?: string;
  draftSeed?: Record<string, unknown> | null;
  onDraftApplied?: () => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [variables, setVariables] = useState(() =>
    customFieldsToPairs(content?.variablesJson).map((field, index) => ({ ...field, id: `${index}-${field.key}` })),
  );
  const [title, setTitle] = useState(content?.title || "");
  const [description, setDescription] = useState(content?.description || "");
  const [contentType, setContentType] = useState(content?.contentType || "Flier");
  const [serviceLine, setServiceLine] = useState(content?.serviceLine || "");
  const [audience, setAudience] = useState(content?.audience || "");
  const [channel, setChannel] = useState(content?.channel || "");
  const [industry, setIndustry] = useState(content?.industry || "");
  const [offerType, setOfferType] = useState(content?.offerType || "");
  const [assetFormat, setAssetFormat] = useState(content?.assetFormat || "");
  const [tone, setTone] = useState(content?.tone || "");
  const [lifecycleStage, setLifecycleStage] = useState(content?.lifecycleStage || "");
  const [fileName, setFileName] = useState(content?.fileName || "");
  const [fileUrl, setFileUrl] = useState(content?.fileUrl || "");
  const [imagePrompt, setImagePrompt] = useState(content?.imagePrompt || "");
  const [imageUrl, setImageUrl] = useState(content?.imageUrl || "");
  const [callToAction, setCallToAction] = useState(content?.callToAction || "");
  const [bodyText, setBodyText] = useState(content?.bodyText || "");
  const [bodyHtml, setBodyHtml] = useState(content?.bodyHtml || "");
  const [promptNotes, setPromptNotes] = useState(content?.promptNotes || "");
  const [promptTemplateKey, setPromptTemplateKey] = useState(content?.promptTemplateKey || "");
  const [tagsInput, setTagsInput] = useState(toCommaList(content?.tagsJson));
  const [taxonomyInput, setTaxonomyInput] = useState(toCommaList(content?.taxonomyJson));
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const isEdit = Boolean(content);
  const actionLabel = useMemo(() => (pending ? "Saving..." : submitLabel), [pending, submitLabel]);

  useEffect(() => {
    if (!draftSeed || isEdit) return;

    if (draftSeed.headline) setTitle(String(draftSeed.headline));
    if (draftSeed.subheadline) setDescription(String(draftSeed.subheadline));
    if (draftSeed.bodyText) setBodyText(String(draftSeed.bodyText));
    if (draftSeed.callToAction) setCallToAction(String(draftSeed.callToAction));
    if (draftSeed.imagePrompt) setImagePrompt(String(draftSeed.imagePrompt));
    if (draftSeed.imageUrl) setImageUrl(String(draftSeed.imageUrl));
    if (Array.isArray(draftSeed.tags)) setTagsInput(draftSeed.tags.map((value) => String(value)).join(", "));
    if (Array.isArray(draftSeed.taxonomy)) setTaxonomyInput(draftSeed.taxonomy.map((value) => String(value)).join(", "));

    onDraftApplied?.();
  }, [draftSeed, isEdit, onDraftApplied]);

  async function createUploadedAssetRecord(uploadedName: string, uploadedUrl: string, contentTypeValue: string) {
    const payload = {
      title: title || uploadedName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
      description: description || null,
      contentType,
      serviceLine: serviceLine || null,
      audience: audience || null,
      channel: channel || null,
      industry: industry || null,
      offerType: offerType || null,
      assetFormat: assetFormat || null,
      tone: tone || null,
      lifecycleStage: lifecycleStage || null,
      fileName: uploadedName,
      fileUrl: uploadedUrl,
      imagePrompt: imagePrompt || null,
      imageUrl: contentTypeValue.startsWith("image/") ? uploadedUrl : imageUrl || null,
      callToAction: callToAction || null,
      bodyText: bodyText || null,
      bodyHtml: bodyHtml || null,
      promptNotes: promptNotes || null,
      promptTemplateKey: promptTemplateKey || null,
      tags: tagsInput.split(",").map((value) => value.trim()).filter(Boolean),
      taxonomy: taxonomyInput.split(",").map((value) => value.trim()).filter(Boolean),
      variables: variables.map(({ key, value }) => ({ key, value })),
    };

    const response = await fetch("/api/marketing-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || "Failed to save uploaded asset to the library.");
    }

    onSaved?.(body.data);
  }

  async function handleAssetUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", file.type.startsWith("image/") ? "library/marketing/images" : "library/marketing/files");

    const response = await fetch("/api/marketing-content/upload", {
      method: "POST",
      body: formData,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to upload asset.");
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
      return;
    }

    const uploadedName = String(body.data?.fileName || file.name);
    const uploadedUrl = String(body.data?.fileUrl || "");

    setFileName(uploadedName);
    setFileUrl(uploadedUrl);
    if (!title) {
      setTitle(uploadedName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
    }
    if (file.type.startsWith("image/")) {
      setImageUrl(uploadedUrl);
    }

    try {
      if (!isEdit) {
        await createUploadedAssetRecord(uploadedName, uploadedUrl, file.type || "application/octet-stream");
        setMessage(`Uploaded ${uploadedName} and added it to the library.`);
      } else {
        setMessage(`Uploaded ${uploadedName}. Save the record to update the library entry.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Uploaded file, but failed to save the library record.");
    }

    setUploading(false);
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const payload = {
      title,
      description: description || null,
      contentType,
      serviceLine: serviceLine || null,
      audience: audience || null,
      channel: channel || null,
      industry: industry || null,
      offerType: offerType || null,
      assetFormat: assetFormat || null,
      tone: tone || null,
      lifecycleStage: lifecycleStage || null,
      fileName: fileName || null,
      fileUrl: fileUrl || null,
      imagePrompt: imagePrompt || null,
      imageUrl: imageUrl || null,
      callToAction: callToAction || null,
      bodyText: bodyText || null,
      bodyHtml: bodyHtml || null,
      promptNotes: promptNotes || null,
      promptTemplateKey: promptTemplateKey || null,
      tags: tagsInput.split(",").map((value) => value.trim()).filter(Boolean),
      taxonomy: taxonomyInput.split(",").map((value) => value.trim()).filter(Boolean),
      variables: variables.map(({ key, value }) => ({ key, value })),
    };

    const response = await fetch(isEdit ? `/api/marketing-content/${content!.id}` : "/api/marketing-content", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || `Failed to ${isEdit ? "save" : "create"} marketing content.`);
      setPending(false);
      return;
    }

    if (!isEdit) {
      setTitle("");
      setDescription("");
      setContentType("Flier");
      setServiceLine("");
      setAudience("");
      setChannel("");
      setIndustry("");
      setOfferType("");
      setAssetFormat("");
      setTone("");
      setLifecycleStage("");
      setFileName("");
      setFileUrl("");
      setImagePrompt("");
      setImageUrl("");
      setCallToAction("");
      setBodyText("");
      setBodyHtml("");
      setPromptNotes("");
      setPromptTemplateKey("");
      setTagsInput("");
      setTaxonomyInput("");
      setVariables([]);
    }

    onSaved?.(body.data);
    setMessage(isEdit ? "Marketing content saved." : "Marketing content created.");
    setPending(false);
  }

  async function handleDelete() {
    if (!content) return;
    if (!window.confirm(`Delete ${content.title}?`)) return;

    setPending(true);
    setMessage(null);
    const response = await fetch(`/api/marketing-content/${content.id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(body.error || "Failed to delete marketing content.");
      setPending(false);
      return;
    }

    onDeleted?.(content.id);
    setMessage("Marketing content deleted.");
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="inline-grid">
      <div className="actions marketing-upload-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <span className="help">Upload an existing flyer, PDF, image, or other collateral, then save its metadata into the library.</span>
        <label className="button secondary marketing-upload-button" style={{ cursor: uploading ? "progress" : "pointer", opacity: uploading ? 0.7 : 1 }}>
          {uploading ? "Uploading..." : "Upload Existing Asset"}
          <input ref={uploadInputRef} type="file" hidden onChange={handleAssetUpload} disabled={uploading || pending} />
        </label>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor={`content-title-${content?.id || "new"}`}>Title</label>
          <input id={`content-title-${content?.id || "new"}`} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Veterinary Voice & Internet Flier" required />
        </div>
        <div className="field">
          <label htmlFor={`content-type-${content?.id || "new"}`}>Content type</label>
          <select id={`content-type-${content?.id || "new"}`} value={contentType} onChange={(event) => setContentType(event.target.value)}>
            {contentTypes.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-service-line-${content?.id || "new"}`}>Service line</label>
          <select id={`content-service-line-${content?.id || "new"}`} value={serviceLine} onChange={(event) => setServiceLine(event.target.value)}>
            <option value="">Unspecified</option>
            {serviceLineOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-audience-${content?.id || "new"}`}>Audience</label>
          <select id={`content-audience-${content?.id || "new"}`} value={audience} onChange={(event) => setAudience(event.target.value)}>
            <option value="">Unspecified</option>
            {audienceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-channel-${content?.id || "new"}`}>Channel</label>
          <select id={`content-channel-${content?.id || "new"}`} value={channel} onChange={(event) => setChannel(event.target.value)}>
            <option value="">Unspecified</option>
            {channelOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-industry-${content?.id || "new"}`}>Industry</label>
          <select id={`content-industry-${content?.id || "new"}`} value={industry} onChange={(event) => setIndustry(event.target.value)}>
            <option value="">Unspecified</option>
            {industryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-offer-type-${content?.id || "new"}`}>Offer type</label>
          <select id={`content-offer-type-${content?.id || "new"}`} value={offerType} onChange={(event) => setOfferType(event.target.value)}>
            <option value="">Unspecified</option>
            {offerTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-asset-format-${content?.id || "new"}`}>Asset format</label>
          <select id={`content-asset-format-${content?.id || "new"}`} value={assetFormat} onChange={(event) => setAssetFormat(event.target.value)}>
            <option value="">Unspecified</option>
            {assetFormatOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-tone-${content?.id || "new"}`}>Tone</label>
          <select id={`content-tone-${content?.id || "new"}`} value={tone} onChange={(event) => setTone(event.target.value)}>
            <option value="">Unspecified</option>
            {toneOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-lifecycle-stage-${content?.id || "new"}`}>Lifecycle stage</label>
          <select id={`content-lifecycle-stage-${content?.id || "new"}`} value={lifecycleStage} onChange={(event) => setLifecycleStage(event.target.value)}>
            <option value="">Unspecified</option>
            {lifecycleStageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-file-name-${content?.id || "new"}`}>File name</label>
          <input id={`content-file-name-${content?.id || "new"}`} value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="vet-voice-flyer.pdf" />
        </div>
        <div className="field">
          <label htmlFor={`content-file-url-${content?.id || "new"}`}>File URL</label>
          <input id={`content-file-url-${content?.id || "new"}`} value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} placeholder="https://..." />
        </div>
        <div className="field">
          <label htmlFor={`content-tags-${content?.id || "new"}`}>Tags</label>
          <input id={`content-tags-${content?.id || "new"}`} value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder="veterinary, phones, internet, flier" />
        </div>
        <div className="field">
          <label htmlFor={`content-taxonomy-${content?.id || "new"}`}>Taxonomy</label>
          <input id={`content-taxonomy-${content?.id || "new"}`} value={taxonomyInput} onChange={(event) => setTaxonomyInput(event.target.value)} placeholder="healthcare, awareness, bundle-offer" />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`content-description-${content?.id || "new"}`}>Description</label>
        <textarea id={`content-description-${content?.id || "new"}`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What this piece is for, who it targets, and where it should be used." />
      </div>
      <div className="field">
        <label htmlFor={`content-image-prompt-${content?.id || "new"}`}>Image prompt</label>
        <textarea id={`content-image-prompt-${content?.id || "new"}`} value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} placeholder="Visual brief for generated artwork." />
      </div>
      <div className="field">
        <label htmlFor={`content-image-url-${content?.id || "new"}`}>Image URL / data URL</label>
        <textarea id={`content-image-url-${content?.id || "new"}`} value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Generated image reference or stored asset URL." />
      </div>
      {imageUrl ? (
        <div className="card subtle-card">
          <div className="card-header dashboard-panel-header">
            <div>
              <h4>Current Image</h4>
              <p className="help">This is the image that will be associated with the marketing asset.</p>
            </div>
            <a className="button secondary" href={imageUrl} target="_blank" rel="noreferrer">Open Image</a>
          </div>
          <img
            src={imageUrl}
            alt={title || "Marketing asset preview"}
            style={{ width: "100%", maxHeight: "420px", objectFit: "contain", borderRadius: "16px", background: "#f5f5f5" }}
          />
        </div>
      ) : null}
      <div className="field">
        <label htmlFor={`content-cta-${content?.id || "new"}`}>Call to action</label>
        <input id={`content-cta-${content?.id || "new"}`} value={callToAction} onChange={(event) => setCallToAction(event.target.value)} placeholder="Book a connectivity review" />
      </div>
      <div className="field">
        <label htmlFor={`content-body-text-${content?.id || "new"}`}>Body text</label>
        <textarea id={`content-body-text-${content?.id || "new"}`} value={bodyText} onChange={(event) => setBodyText(event.target.value)} placeholder="Plain-text copy or internal summary." />
      </div>
      <div className="field">
        <label htmlFor={`content-body-html-${content?.id || "new"}`}>Body HTML</label>
        <textarea id={`content-body-html-${content?.id || "new"}`} value={bodyHtml} onChange={(event) => setBodyHtml(event.target.value)} placeholder="Optional HTML version for email or landing page content." />
      </div>
      <div className="field">
        <label htmlFor={`content-prompt-notes-${content?.id || "new"}`}>Prompt notes / generation brief</label>
        <textarea id={`content-prompt-notes-${content?.id || "new"}`} value={promptNotes} onChange={(event) => setPromptNotes(event.target.value)} placeholder="Prompt notes used to create or extend this asset with ChatGPT or image generation tools." />
      </div>
      <div className="field">
        <label htmlFor={`content-template-key-${content?.id || "new"}`}>Prompt template key</label>
        <input id={`content-template-key-${content?.id || "new"}`} value={promptTemplateKey} onChange={(event) => setPromptTemplateKey(event.target.value)} placeholder="veterinary-phones" />
      </div>
      <CustomFieldsEditor entity="content-variable" fields={variables} onChange={setVariables} />
      <div className="actions">
        <button className="button primary" type="submit" disabled={pending || uploading}>{actionLabel}</button>
        {content ? <button className="button secondary" type="button" disabled={pending || uploading} onClick={() => void handleDelete()}>Delete Content</button> : null}
        {message ? <span className="help">{message}</span> : null}
      </div>
    </form>
  );
}
