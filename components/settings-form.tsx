"use client";

import { FormEvent, useState } from "react";
import type { GeneralSettings, SenderProfile } from "@/lib/settings";

export function SettingsForm({ initial }: { initial: GeneralSettings }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [senderProfiles, setSenderProfiles] = useState<SenderProfile[]>(initial.senderProfiles);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      defaultFromName: String(form.get("defaultFromName") || ""),
      defaultFromEmail: String(form.get("defaultFromEmail") || ""),
      defaultReplyTo: String(form.get("defaultReplyTo") || ""),
      emailProvider: String(form.get("emailProvider") || "resend"),
      internalTestEmail: String(form.get("internalTestEmail") || ""),
      targetStates: String(form.get("targetStates") || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      senderProfiles,
    };

    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to save settings.");
      setPending(false);
      return;
    }

    setMessage("Settings saved.");
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="inline-grid">
      <div className="card subtle-card">
        <div className="record-summary-main">
          <div className="record-summary-topline">
            <h3>Operator Defaults</h3>
            <span className="badge badge-blue">{initial.emailProvider}</span>
          </div>
          <div className="record-meta-row">
            <span>{initial.defaultFromEmail || "No default from email"}</span>
            <span>{initial.defaultReplyTo || "No reply-to"}</span>
            <span>{initial.targetStates.length} target state{initial.targetStates.length === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="settings-default-from-name">Default from name</label>
          <input id="settings-default-from-name" name="defaultFromName" defaultValue={initial.defaultFromName} />
        </div>
        <div className="field">
          <label htmlFor="settings-default-from-email">Default from email</label>
          <input id="settings-default-from-email" name="defaultFromEmail" type="email" defaultValue={initial.defaultFromEmail} />
        </div>
        <div className="field">
          <label htmlFor="settings-default-reply-to">Default reply-to</label>
          <input id="settings-default-reply-to" name="defaultReplyTo" type="email" defaultValue={initial.defaultReplyTo} />
        </div>
        <div className="field">
          <label htmlFor="settings-email-provider">Email provider</label>
          <select id="settings-email-provider" name="emailProvider" defaultValue={initial.emailProvider}>
            <option value="resend">resend</option>
            <option value="mailgun">mailgun</option>
            <option value="dry-run">dry-run</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="settings-internal-test-email">Internal test email</label>
          <input id="settings-internal-test-email" name="internalTestEmail" type="email" defaultValue={initial.internalTestEmail} />
        </div>
        <div className="field">
          <label htmlFor="settings-target-states">Target states</label>
          <input id="settings-target-states" name="targetStates" defaultValue={initial.targetStates.join(", ")} placeholder="TX, OK, NM" />
        </div>
      </div>
      <div className="card subtle-card">
        <div className="record-summary-main">
          <div className="record-summary-topline">
            <h3>Sender Profiles</h3>
            <button
              className="button secondary"
              type="button"
              onClick={() => setSenderProfiles((current) => [...current, { id: `sender-${Date.now()}`, label: "", fromName: "", fromEmail: "", replyTo: "" }])}
            >
              Add Sender
            </button>
          </div>
          <div className="inline-grid">
            {senderProfiles.map((profile) => (
              <div key={profile.id} className="card subtle-card">
                <div className="form-grid">
                  <div className="field">
                    <label>Label</label>
                    <input value={profile.label} onChange={(event) => setSenderProfiles((current) => current.map((entry) => entry.id === profile.id ? { ...entry, label: event.target.value } : entry))} placeholder="Primary domain" />
                  </div>
                  <div className="field">
                    <label>From name</label>
                    <input value={profile.fromName} onChange={(event) => setSenderProfiles((current) => current.map((entry) => entry.id === profile.id ? { ...entry, fromName: event.target.value } : entry))} placeholder="Field Notes CRM" />
                  </div>
                  <div className="field">
                    <label>From email</label>
                    <input type="email" value={profile.fromEmail} onChange={(event) => setSenderProfiles((current) => current.map((entry) => entry.id === profile.id ? { ...entry, fromEmail: event.target.value } : entry))} placeholder="campaigns@example.com" />
                  </div>
                  <div className="field">
                    <label>Reply-to</label>
                    <input type="email" value={profile.replyTo} onChange={(event) => setSenderProfiles((current) => current.map((entry) => entry.id === profile.id ? { ...entry, replyTo: event.target.value } : entry))} placeholder="replies@example.com" />
                  </div>
                </div>
                <div className="actions">
                  <button className="button secondary" type="button" onClick={() => setSenderProfiles((current) => current.filter((entry) => entry.id !== profile.id))}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="actions">
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save Settings"}
        </button>
        {message ? <span className="help">{message}</span> : null}
      </div>
    </form>
  );
}
