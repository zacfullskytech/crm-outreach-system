"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CustomFieldsEditor } from "@/components/custom-fields-editor";
import { customFieldsToPairs } from "@/lib/custom-fields";
import type { MarketingContent } from "@prisma/client";

type MarketingContentRecord = MarketingContent;

const contentTypes = ["Flier", "One-pager", "Email copy", "Landing page", "Social post", "Offer sheet", "Case study"];
const serviceLineOptions = ["Phones", "Internet", "Cybersecurity", "Managed IT", "VoIP", "Connectivity"];
const audienceOptions = ["Veterinary clinics", "Private medical practices", "Dental offices", "Retail", "SMB"];
const channelOptions = ["Print", "Email", "Web", "Sales handout", "Social", "Internal"];

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
  const [variables, setVariables] = useState(() =>
    customFieldsToPairs(content?.variablesJson).map((field, index) => ({ ...field, id: `${index}-${field.key}` })),
  );
  const [title, setTitle] = useState(content?.title || "");
  const [description, setDescription] = useState(content?.description || "");
  const [contentType, setContentType] = useState(content?.contentType || "Flier");
  const [serviceLine, setServiceLine] = useState(content?.serviceLine || "");
  const [audience, setAudience] = useState(content?.audience || "");
  const [channel, setChannel] = useState(content?.channel || "");
  const [fileName, setFileName] = useState(content?.fileName || "");
  const [fileUrl, setFileUrl] = useState(content?.fileUrl || "");
  const [bodyText, setBodyText] = useState(content?.bodyText || "");
  const [bodyHtml, setBodyHtml] = useState(content?.bodyHtml || "");
  const [promptNotes, setPromptNotes] = useState(content?.promptNotes || "");
  const [tagsInput, setTagsInput] = useState(
    Array.isArray(content?.tagsJson) ? content.tagsJson.map((value) => String(value)).join(", ") : "",
  );

  const isEdit = Boolean(content);
  const actionLabel = useMemo(() => (pending ? "Saving..." : submitLabel), [pending, submitLabel]);

  useEffect(() => {
    if (!draftSeed || isEdit) return;

    if (draftSeed.headline) setTitle(String(draftSeed.headline));
    if (draftSeed.subheadline) setDescription(String(draftSeed.subheadline));
    if (draftSeed.bodyText) setBodyText(String(draftSeed.bodyText));
    if (draftSeed.imagePrompt) setPromptNotes(String(draftSeed.imagePrompt));
    if (Array.isArray(draftSeed.tags)) setTagsInput(draftSeed.tags.map((value) => String(value)).join(", "));

    onDraftApplied?.();
  }, [draftSeed, isEdit, onDraftApplied]);

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
      fileName: fileName || null,
      fileUrl: fileUrl || null,
      bodyText: bodyText || null,
      bodyHtml: bodyHtml || null,
      promptNotes: promptNotes || null,
      tags: tagsInput
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
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
      setFileName("");
      setFileUrl("");
      setBodyText("");
      setBodyHtml("");
      setPromptNotes("");
      setTagsInput("");
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
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`content-title-${content?.id || "new"}`}>Title</label>
          <input id={`content-title-${content?.id || "new"}`} name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Veterinary Voice & Internet Flier" required />
        </div>
        <div className="field">
          <label htmlFor={`content-type-${content?.id || "new"}`}>Content type</label>
          <select id={`content-type-${content?.id || "new"}`} name="contentType" value={contentType} onChange={(event) => setContentType(event.target.value)}>
            {contentTypes.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-service-line-${content?.id || "new"}`}>Service line</label>
          <select id={`content-service-line-${content?.id || "new"}`} name="serviceLine" value={serviceLine} onChange={(event) => setServiceLine(event.target.value)}>
            <option value="">Unspecified</option>
            {serviceLineOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-audience-${content?.id || "new"}`}>Audience</label>
          <select id={`content-audience-${content?.id || "new"}`} name="audience" value={audience} onChange={(event) => setAudience(event.target.value)}>
            <option value="">Unspecified</option>
            {audienceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-channel-${content?.id || "new"}`}>Channel</label>
          <select id={`content-channel-${content?.id || "new"}`} name="channel" value={channel} onChange={(event) => setChannel(event.target.value)}>
            <option value="">Unspecified</option>
            {channelOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-file-name-${content?.id || "new"}`}>File name</label>
          <input id={`content-file-name-${content?.id || "new"}`} name="fileName" value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="vet-voice-flyer.pdf" />
        </div>
        <div className="field">
          <label htmlFor={`content-file-url-${content?.id || "new"}`}>File URL</label>
          <input id={`content-file-url-${content?.id || "new"}`} name="fileUrl" value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} placeholder="https://..." />
        </div>
        <div className="field">
          <label htmlFor={`content-tags-${content?.id || "new"}`}>Tags</label>
          <input id={`content-tags-${content?.id || "new"}`} name="tags" value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder="veterinary, phones, internet, flier" />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`content-description-${content?.id || "new"}`}>Description</label>
        <textarea id={`content-description-${content?.id || "new"}`} name="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What this piece is for, who it targets, and where it should be used." />
      </div>
      <div className="field">
        <label htmlFor={`content-body-text-${content?.id || "new"}`}>Body text</label>
        <textarea id={`content-body-text-${content?.id || "new"}`} name="bodyText" value={bodyText} onChange={(event) => setBodyText(event.target.value)} placeholder="Plain-text copy or internal summary." />
      </div>
      <div className="field">
        <label htmlFor={`content-body-html-${content?.id || "new"}`}>Body HTML</label>
        <textarea id={`content-body-html-${content?.id || "new"}`} name="bodyHtml" value={bodyHtml} onChange={(event) => setBodyHtml(event.target.value)} placeholder="Optional HTML version for email or landing page content." />
      </div>
      <div className="field">
        <label htmlFor={`content-prompt-notes-${content?.id || "new"}`}>Prompt notes / generation brief</label>
        <textarea id={`content-prompt-notes-${content?.id || "new"}`} name="promptNotes" value={promptNotes} onChange={(event) => setPromptNotes(event.target.value)} placeholder="Prompt notes used to create or extend this asset with ChatGPT or image generation tools." />
      </div>
      <CustomFieldsEditor entity="content-variable" fields={variables} onChange={setVariables} />
      <div className="actions">
        <button className="button primary" type="submit" disabled={pending}>{actionLabel}</button>
        {content ? <button className="button secondary" type="button" disabled={pending} onClick={() => void handleDelete()}>Delete Content</button> : null}
        {message ? <span className="help">{message}</span> : null}
      </div>
    </form>
  );
}
