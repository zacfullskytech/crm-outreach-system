"use client";

import { FormEvent, useMemo, useState } from "react";
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
}: {
  content?: MarketingContentRecord;
  onSaved?: (content: MarketingContentRecord) => void;
  onDeleted?: (id: string) => void;
  submitLabel?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [variables, setVariables] = useState(() =>
    customFieldsToPairs(content?.variablesJson).map((field, index) => ({ ...field, id: `${index}-${field.key}` })),
  );

  const isEdit = Boolean(content);
  const actionLabel = useMemo(() => (pending ? "Saving..." : submitLabel), [pending, submitLabel]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") || ""),
      description: String(form.get("description") || "") || null,
      contentType: String(form.get("contentType") || "Flier"),
      serviceLine: String(form.get("serviceLine") || "") || null,
      audience: String(form.get("audience") || "") || null,
      channel: String(form.get("channel") || "") || null,
      fileName: String(form.get("fileName") || "") || null,
      fileUrl: String(form.get("fileUrl") || "") || null,
      bodyText: String(form.get("bodyText") || "") || null,
      bodyHtml: String(form.get("bodyHtml") || "") || null,
      promptNotes: String(form.get("promptNotes") || "") || null,
      tags: String(form.get("tags") || "")
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
      event.currentTarget.reset();
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

  const initialTags = Array.isArray(content?.tagsJson) ? content.tagsJson.map((value) => String(value)).join(", ") : "";

  return (
    <form onSubmit={onSubmit} className="inline-grid">
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`content-title-${content?.id || "new"}`}>Title</label>
          <input id={`content-title-${content?.id || "new"}`} name="title" defaultValue={content?.title || ""} placeholder="Veterinary Voice & Internet Flier" required />
        </div>
        <div className="field">
          <label htmlFor={`content-type-${content?.id || "new"}`}>Content type</label>
          <select id={`content-type-${content?.id || "new"}`} name="contentType" defaultValue={content?.contentType || "Flier"}>
            {contentTypes.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-service-line-${content?.id || "new"}`}>Service line</label>
          <select id={`content-service-line-${content?.id || "new"}`} name="serviceLine" defaultValue={content?.serviceLine || ""}>
            <option value="">Unspecified</option>
            {serviceLineOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-audience-${content?.id || "new"}`}>Audience</label>
          <select id={`content-audience-${content?.id || "new"}`} name="audience" defaultValue={content?.audience || ""}>
            <option value="">Unspecified</option>
            {audienceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-channel-${content?.id || "new"}`}>Channel</label>
          <select id={`content-channel-${content?.id || "new"}`} name="channel" defaultValue={content?.channel || ""}>
            <option value="">Unspecified</option>
            {channelOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`content-file-name-${content?.id || "new"}`}>File name</label>
          <input id={`content-file-name-${content?.id || "new"}`} name="fileName" defaultValue={content?.fileName || ""} placeholder="vet-voice-flyer.pdf" />
        </div>
        <div className="field">
          <label htmlFor={`content-file-url-${content?.id || "new"}`}>File URL</label>
          <input id={`content-file-url-${content?.id || "new"}`} name="fileUrl" defaultValue={content?.fileUrl || ""} placeholder="https://..." />
        </div>
        <div className="field">
          <label htmlFor={`content-tags-${content?.id || "new"}`}>Tags</label>
          <input id={`content-tags-${content?.id || "new"}`} name="tags" defaultValue={initialTags} placeholder="veterinary, phones, internet, flier" />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`content-description-${content?.id || "new"}`}>Description</label>
        <textarea id={`content-description-${content?.id || "new"}`} name="description" defaultValue={content?.description || ""} placeholder="What this piece is for, who it targets, and where it should be used." />
      </div>
      <div className="field">
        <label htmlFor={`content-body-text-${content?.id || "new"}`}>Body text</label>
        <textarea id={`content-body-text-${content?.id || "new"}`} name="bodyText" defaultValue={content?.bodyText || ""} placeholder="Plain-text copy or internal summary." />
      </div>
      <div className="field">
        <label htmlFor={`content-body-html-${content?.id || "new"}`}>Body HTML</label>
        <textarea id={`content-body-html-${content?.id || "new"}`} name="bodyHtml" defaultValue={content?.bodyHtml || ""} placeholder="Optional HTML version for email or landing page content." />
      </div>
      <div className="field">
        <label htmlFor={`content-prompt-notes-${content?.id || "new"}`}>Prompt notes / generation brief</label>
        <textarea id={`content-prompt-notes-${content?.id || "new"}`} name="promptNotes" defaultValue={content?.promptNotes || ""} placeholder="Prompt notes used to create or extend this asset with ChatGPT or image generation tools." />
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
