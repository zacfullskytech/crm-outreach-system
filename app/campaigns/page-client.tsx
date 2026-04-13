"use client";

import { useState } from "react";
import { CampaignForm } from "@/components/campaign-form";
import { AppShell } from "@/components/app-shell";
import type { Campaign, Segment, CampaignRecipient } from "@prisma/client";

type CampaignWithRecipients = Campaign & { recipients: CampaignRecipient[] };
type SegmentOption = Pick<Segment, "id" | "name" | "entityType">;

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

export function CampaignsPageClient({
  initialCampaigns,
  initialSegments,
  isAdmin,
}: {
  initialCampaigns: CampaignWithRecipients[];
  initialSegments: SegmentOption[];
  isAdmin: boolean;
}) {
  const [campaigns] = useState(initialCampaigns);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(true);
  const [isListOpen, setIsListOpen] = useState(true);

  const filtered = campaigns.filter((campaign) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (campaign.name || "").toLowerCase().includes(q) ||
      (campaign.subject || "").toLowerCase().includes(q) ||
      (campaign.fromEmail || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "ALL" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
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
          {isCreateOpen ? <CampaignForm segments={initialSegments} /> : null}
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
              </div>

              {filtered.length === 0 ? (
                <div className="empty-state">
                  <p>{search || statusFilter !== "ALL" ? "No campaigns match your filters." : "No campaigns yet."}</p>
                </div>
              ) : (
                <div className="inline-grid">
                  {filtered.map((campaign) => (
                    <details key={campaign.id} className="card content-item" open={false}>
                      <summary className="card-header content-item-summary">
                        <div>
                          <h3>{campaign.name}</h3>
                          <p className="help">{campaign.subject || "No subject"}</p>
                          <p className="help">{campaign.fromEmail} · {campaign.recipients.length} recipient{campaign.recipients.length === 1 ? "" : "s"}</p>
                        </div>
                        <div className="content-item-summary-right">
                          <span className={statusBadgeClass(campaign.status)}>{campaign.status}</span>
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
                            {campaign.status === "SCHEDULED" ? <p className="help">Scheduled campaigns are stored for manual dispatch right now. Automatic scheduled sending is not implemented yet.</p> : null}
                          </div>
                        </div>
                        <div className="card">
                          <h4>HTML Body</h4>
                          <p className="campaign-template-preview">{campaign.templateHtml}</p>
                        </div>
                        <div className="card">
                          <h4>Plain-text Body</h4>
                          <p className="campaign-template-preview">{campaign.templateText || "No plain-text body"}</p>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
