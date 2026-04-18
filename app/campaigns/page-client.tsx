"use client";

import { useState } from "react";
import { CampaignForm } from "@/components/campaign-form";
import { MarketingAiStudio } from "@/components/marketing-ai-studio";
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
  const [campaigns] = useState(initialCampaigns);
  const [draftSeed, setDraftSeed] = useState<CampaignDraftSeed>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [campaignView, setCampaignView] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(true);
  const [isListOpen, setIsListOpen] = useState(true);

  const draftCampaigns = campaigns.filter((campaign) => campaign.status === "DRAFT").length;
  const scheduledCampaigns = campaigns.filter((campaign) => campaign.status === "SCHEDULED").length;
  const sentCampaigns = campaigns.filter((campaign) => campaign.status === "SENT").length;
  const totalRecipients = campaigns.reduce((count, campaign) => count + campaign.recipients.length, 0);
  const campaignsNeedingAttention = campaigns.filter((campaign) => campaign.status === "FAILED" || campaign.recipients.some((recipient) => recipient.status === "FAILED")).length;

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

        <section className="card collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>AI Campaign Drafts</h3>
              <p className="help">Generate campaign-ready copy and push it directly into the draft form.</p>
            </div>
            <button className="button secondary" type="button" onClick={() => setIsCreateOpen((value) => !value)}>
              {isCreateOpen ? "Collapse Draft Form" : "Expand Draft Form"}
            </button>
          </div>
          <MarketingAiStudio
            segments={initialSegments}
            onUseCampaignDraft={(draft) => {
              setDraftSeed(draft);
              setIsCreateOpen(true);
            }}
          />
        </section>

        <section className="card form-section collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>Create Campaign Draft</h3>
              <p className="help">Build a draft, preview the audience, and keep the send configuration together.</p>
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
                            <span className="help">View</span>
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
                            </div>
                          </div>
                          <div className="card campaign-body-card">
                            <h4>HTML Body</h4>
                            <p className="campaign-template-preview">{campaign.templateHtml}</p>
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
