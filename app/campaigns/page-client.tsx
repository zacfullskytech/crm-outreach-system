"use client";

import { useMemo, useState } from "react";
import { CampaignForm } from "@/components/campaign-form";
import { AppShell } from "@/components/app-shell";
import type { Campaign, Segment, CampaignRecipient } from "@prisma/client";

type CampaignWithRecipients = Campaign & { recipients: CampaignRecipient[] };
type SegmentOption = Pick<Segment, "id" | "name" | "entityType">;
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

function statusBadgeClass(status: string) {
  switch (status) {
    case "SENT":
      return "badge badge-green";
    case "SCHEDULED":
      return "badge badge-blue";
    case "SENDING":
      return "badge badge-blue";
    case "FAILED":
      return "badge badge-red";
    default:
      return "badge";
  }
}

type CampaignDraftSeed = {
  name?: string;
  subject?: string;
  templateHtml?: string;
  templateText?: string;
  marketingContentId?: string;
} | null;

type CampaignActionState = {
  pending: string | null;
  message: string | null;
  testEmailByCampaign: Record<string, string>;
};

export function CampaignsPageClient({
  initialCampaigns,
  initialSegments,
  initialDefaults,
  initialMarketingContent,
  isAdmin,
}: {
  initialCampaigns: CampaignWithRecipients[];
  initialSegments: SegmentOption[];
  initialDefaults: { fromName: string; fromEmail: string; replyTo: string };
  initialMarketingContent: MarketingContentOption[];
  isAdmin: boolean;
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [draftSeed, setDraftSeed] = useState<CampaignDraftSeed>(null);
  const [listMessage, setListMessage] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [actionState, setActionState] = useState<CampaignActionState>({ pending: null, message: null, testEmailByCampaign: {} });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [campaignView, setCampaignView] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(true);
  const [isListOpen, setIsListOpen] = useState(true);

  async function deleteCampaign(id: string) {
    setPendingDeleteId(id);
    setListMessage(null);

    const response = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setListMessage(body.error || "Failed to delete campaign.");
      setPendingDeleteId(null);
      return;
    }

    setCampaigns((current) => current.filter((campaign) => campaign.id !== id));
    setListMessage("Campaign deleted.");
    setPendingDeleteId(null);
  }

  async function runCampaignAction(campaignId: string, action: "send" | "dispatch" | "test-send") {
    setActionState((current) => ({ ...current, pending: `${campaignId}:${action}`, message: null }));

    const init: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" } };
    if (action === "test-send") {
      const email = actionState.testEmailByCampaign[campaignId]?.trim();
      if (!email) {
        setActionState((current) => ({ ...current, pending: null, message: "Enter a test email first." }));
        return;
      }
      init.body = JSON.stringify({ email });
    }

    const response = await fetch(`/api/campaigns/${campaignId}/${action}`, init);
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setActionState((current) => ({ ...current, pending: null, message: body.error || `Failed to ${action} campaign.` }));
      return;
    }

    if (action === "test-send") {
      setActionState((current) => ({ ...current, pending: null, message: `Test email sent to ${body.data?.sentTo || "recipient"}.` }));
      return;
    }

    const refreshed = await fetch(`/api/campaigns/${campaignId}`);
    const refreshedBody = await refreshed.json().catch(() => ({}));
    const refreshedCampaign = refreshedBody?.data?.campaign
      ? campaigns.find((entry) => entry.id === campaignId)
      : null;

    setCampaigns((current) => current.map((entry) => {
      if (entry.id !== campaignId) return entry;
      const totals = refreshedBody?.data?.totals;
      const recipients = Array.isArray(refreshedBody?.data?.recipients) ? refreshedBody.data.recipients : entry.recipients;
      return {
        ...entry,
        status: refreshedBody?.data?.campaign?.status || entry.status,
        sentAt: refreshedBody?.data?.campaign?.sentAt || entry.sentAt,
        recipients,
        name: refreshedBody?.data?.campaign?.name || refreshedCampaign?.name || entry.name,
      };
    }));

    const summary = action === "send"
      ? `Campaign send finished. ${body.data?.delivered?.sent ?? 0} sent, ${body.data?.delivered?.failed ?? 0} failed.`
      : `Dispatch finished. ${body.data?.sent ?? 0} sent, ${body.data?.failed ?? 0} failed, ${body.data?.remaining ?? 0} remaining.`;

    setActionState((current) => ({ ...current, pending: null, message: summary }));
  }

  const draftCampaigns = campaigns.filter((campaign) => campaign.status === "DRAFT").length;
  const scheduledCampaigns = campaigns.filter((campaign) => campaign.status === "SCHEDULED").length;
  const sentCampaigns = campaigns.filter((campaign) => campaign.status === "SENT").length;
  const totalRecipients = campaigns.reduce((count, campaign) => count + campaign.recipients.length, 0);
  const campaignsNeedingAttention = campaigns.filter((campaign) => campaign.status === "FAILED" || campaign.recipients.some((recipient) => recipient.status === "FAILED")).length;

  const readinessByCampaign = useMemo(
    () => Object.fromEntries(campaigns.map((campaign) => {
      const issues: string[] = [];
      if (!campaign.segmentId) issues.push("No segment selected");
      if (!campaign.fromEmail) issues.push("Missing sender email");
      if (!campaign.subject?.trim()) issues.push("Missing subject");
      if (!campaign.templateHtml?.trim()) issues.push("Missing HTML body");
      return [campaign.id, { issues, ready: issues.length === 0 }];
    })),
    [campaigns],
  );

  const filtered = campaigns.filter((campaign) => {
    const q = search.toLowerCase();
    const sentCount = campaign.recipients.filter((recipient) => recipient.status === "SENT").length;
    const failedCount = campaign.recipients.filter((recipient) => recipient.status === "FAILED").length;
    const pendingCount = campaign.recipients.filter((recipient) => recipient.status === "PENDING").length;
    const matchesSearch =
      !q ||
      (campaign.name || "").toLowerCase().includes(q) ||
      (campaign.subject || "").toLowerCase().includes(q) ||
      (campaign.fromEmail || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "ALL" || campaign.status === statusFilter;
    const matchesView =
      campaignView === "ALL" ||
      (campaignView === "READY_TO_SEND" && campaign.status === "DRAFT") ||
      (campaignView === "SCHEDULED" && campaign.status === "SCHEDULED") ||
      (campaignView === "ATTENTION" && (campaign.status === "FAILED" || failedCount > 0)) ||
      (campaignView === "SENT" && (campaign.status === "SENT" || sentCount > 0)) ||
      (campaignView === "PENDING" && pendingCount > 0);
    return matchesSearch && matchesStatus && matchesView;
  });

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Campaigns</span>
          <h2>Send to a filtered audience with snapshot-based recipients.</h2>
          <p>
            Campaigns should preview recipients before send, then keep delivery outcomes tied to the frozen audience snapshot.
          </p>
        </section>

        <section className="stat-grid compact-stat-grid">
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{campaigns.length}</div>
              <div className="stat-label">Campaigns</div>
              <div className="stat-desc">Drafts, scheduled sends, and completed sends in the system.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{draftCampaigns}</div>
              <div className="stat-label">Drafts</div>
              <div className="stat-desc">Campaigns still being assembled before send or scheduling.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{scheduledCampaigns}</div>
              <div className="stat-label">Scheduled</div>
              <div className="stat-desc">Campaigns queued with a future send time.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{sentCampaigns}</div>
              <div className="stat-label">Sent</div>
              <div className="stat-desc">Completed campaign sends with frozen recipient snapshots.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{totalRecipients}</div>
              <div className="stat-label">Recipient Snapshots</div>
              <div className="stat-desc">Stored recipients across all campaign records.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{campaignsNeedingAttention}</div>
              <div className="stat-label">Needs Attention</div>
              <div className="stat-desc">Campaigns with failed sends or failed overall status.</div>
            </div>
          </article>
        </section>

        <section className="card form-section collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>Campaign Creator</h3>
              <p className="help">Build a draft, generate copy with AI if needed, preview the audience, and keep the whole send setup in one place.</p>
            </div>
            <button className="button secondary" type="button" onClick={() => setIsCreateOpen((value) => !value)}>
              {isCreateOpen ? "Collapse" : "Expand"}
            </button>
          </div>
          {isCreateOpen ? (
            <CampaignForm
              segments={initialSegments}
              defaults={initialDefaults}
              marketingContent={initialMarketingContent}
              draftSeed={draftSeed}
              onDraftApplied={() => setDraftSeed(null)}
              showAiAssist
            />
          ) : null}
        </section>

        <section className="card collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>All Campaigns</h3>
              <p className="help">{filtered.length} campaign{filtered.length === 1 ? "" : "s"} in view.</p>
            </div>
            <button className="button secondary" type="button" onClick={() => setIsListOpen((value) => !value)}>
              {isListOpen ? "Collapse" : "Expand"}
            </button>
          </div>

          {isListOpen ? (
            <>
              <div className="filter-row">
                {listMessage ? <span className="help">{listMessage}</span> : null}
                {actionState.message ? <span className="help">{actionState.message}</span> : null}
                <div className="search-wrap">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="search"
                    placeholder="Search campaigns by name, subject, or sender…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="search-input"
                  />
                </div>
                <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="SENDING">Sending</option>
                  <option value="SENT">Sent</option>
                  <option value="FAILED">Failed</option>
                </select>
                <select className="filter-select" value={campaignView} onChange={(e) => setCampaignView(e.target.value)}>
                  <option value="ALL">All campaign views</option>
                  <option value="READY_TO_SEND">Ready to send</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="ATTENTION">Needs attention</option>
                  <option value="PENDING">Has pending recipients</option>
                  <option value="SENT">Sent / delivered</option>
                </select>
              </div>

              {filtered.length === 0 ? (
                <div className="empty-state">
                  <p>{search || statusFilter !== "ALL" ? "No campaigns match your filters." : "No campaigns yet."}</p>
                </div>
              ) : (
                <div className="inline-grid">
                  {filtered.map((campaign) => {
                    const sentCount = campaign.recipients.filter((recipient) => recipient.status === "SENT").length;
                    const failedCount = campaign.recipients.filter((recipient) => recipient.status === "FAILED").length;
                    const pendingCount = campaign.recipients.filter((recipient) => recipient.status === "PENDING").length;

                    return (
                      <details key={campaign.id} className="card content-item" open={false}>
                        <summary className="card-header content-item-summary">
                          <div className="record-summary-main">
                            <div className="record-summary-topline">
                              <h3>{campaign.name}</h3>
                              <span className={statusBadgeClass(campaign.status)}>{campaign.status}</span>
                            </div>
                            <p className="help">{campaign.subject || "No subject"}</p>
                            <div className="record-meta-row">
                              <span>{campaign.fromEmail}</span>
                              <span>{campaign.recipients.length} recipient{campaign.recipients.length === 1 ? "" : "s"}</span>
                              <span>{campaign.scheduledAt ? `Scheduled ${new Date(campaign.scheduledAt).toLocaleString()}` : "Not scheduled"}</span>
                            </div>
                          </div>
                          <div className="content-item-summary-right">
                            <span className="badge badge-blue">{sentCount} sent</span>
                            {failedCount > 0 ? <span className="badge badge-red">{failedCount} failed</span> : null}
                            {pendingCount > 0 ? <span className="badge badge-yellow">{pendingCount} pending</span> : null}
                            <span className={`badge ${readinessByCampaign[campaign.id]?.ready ? "badge-green" : "badge-yellow"}`}>{readinessByCampaign[campaign.id]?.ready ? "Ready" : "Needs setup"}</span>
                            <span className="help">Operate</span>
                          </div>
                        </summary>
                        <div className="content-item-body inline-grid">
                          <div className="grid">
                            <div className="card">
                              <h4>Sender</h4>
                              <p>{campaign.fromName || "No from name"}</p>
                              <p>{campaign.fromEmail}</p>
                              <p>{campaign.replyTo || "No reply-to"}</p>
                            </div>
                            <div className="card">
                              <h4>Timing</h4>
                              <p>Created: {new Date(campaign.createdAt).toLocaleString()}</p>
                              <p>Scheduled: {campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString() : "Not scheduled"}</p>
                              <p>Sent: {campaign.sentAt ? new Date(campaign.sentAt).toLocaleString() : "Not sent"}</p>
                              <p>Delivery summary: {sentCount} sent · {failedCount} failed · {pendingCount} pending</p>
                              <p>{campaign.status === "SCHEDULED" ? "Scheduled campaigns will wait for the scheduler unless you send now manually." : "Manual send is available below."}</p>
                            </div>
                          </div>
                          <div className="card campaign-body-card">
                            <h4>HTML Body</h4>
                            <p className="campaign-template-preview">{campaign.templateHtml}</p>
                          </div>
                          <div className="card subtle-card">
                            <div className="record-summary-main">
                              <div className="record-summary-topline">
                                <h4>Readiness Check</h4>
                                <span className={`badge ${readinessByCampaign[campaign.id]?.ready ? "badge-green" : "badge-yellow"}`}>{readinessByCampaign[campaign.id]?.ready ? "Ready to send" : "Needs setup"}</span>
                              </div>
                              {readinessByCampaign[campaign.id]?.issues.length ? (
                                <ul>
                                  {readinessByCampaign[campaign.id].issues.map((issue) => <li key={`${campaign.id}-${issue}`}>{issue}</li>)}
                                </ul>
                              ) : (
                                <p className="help">Sender, subject, body, and segment are in place.</p>
                              )}
                            </div>
                          </div>
                          <div className="actions">
                            <button
                              className="button secondary"
                              type="button"
                              onClick={() => {
                                setDraftSeed({
                                  name: `${campaign.name} Copy`,
                                  subject: campaign.subject,
                                  templateHtml: campaign.templateHtml,
                                  templateText: campaign.templateText || undefined,
                                });
                                setIsCreateOpen(true);
                              }}
                            >
                              Duplicate Into Draft
                            </button>
                            <input
                              className="search-input"
                              placeholder="test@example.com"
                              value={actionState.testEmailByCampaign[campaign.id] || ""}
                              onChange={(event) => setActionState((current) => ({
                                ...current,
                                testEmailByCampaign: { ...current.testEmailByCampaign, [campaign.id]: event.target.value },
                              }))}
                            />
                            <button
                              className="button secondary"
                              type="button"
                              disabled={actionState.pending === `${campaign.id}:test-send` || !readinessByCampaign[campaign.id]?.ready}
                              onClick={() => void runCampaignAction(campaign.id, "test-send")}
                            >
                              {actionState.pending === `${campaign.id}:test-send` ? "Sending Test..." : "Send Test"}
                            </button>
                            <button
                              className="button primary"
                              type="button"
                              disabled={actionState.pending === `${campaign.id}:send` || !readinessByCampaign[campaign.id]?.ready}
                              onClick={() => void runCampaignAction(campaign.id, "send")}
                            >
                              {actionState.pending === `${campaign.id}:send` ? "Sending..." : "Send Now"}
                            </button>
                            {pendingCount > 0 ? (
                              <button
                                className="button secondary"
                                type="button"
                                disabled={actionState.pending === `${campaign.id}:dispatch`}
                                onClick={() => void runCampaignAction(campaign.id, "dispatch")}
                              >
                                {actionState.pending === `${campaign.id}:dispatch` ? "Dispatching..." : "Dispatch Pending"}
                              </button>
                            ) : null}
                            <button
                              className="button secondary"
                              type="button"
                              disabled={pendingDeleteId === campaign.id}
                              onClick={() => void deleteCampaign(campaign.id)}
                            >
                              {pendingDeleteId === campaign.id ? "Deleting..." : "Delete Campaign"}
                            </button>
                          </div>
                          <div className="card campaign-body-card">
                            <h4>Plain-text Body</h4>
                            <p className="campaign-template-preview">{campaign.templateText || "No plain-text body"}</p>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
