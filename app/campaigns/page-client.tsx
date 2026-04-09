"use client";

import { useState } from "react";
import { CampaignForm } from "@/components/campaign-form";
import { AppShell } from "@/components/app-shell";
import type { Campaign, Segment, CampaignRecipient } from "@prisma/client";

type CampaignWithRecipients = Campaign & { recipients: CampaignRecipient[] };
type SegmentOption = Pick<Segment, "id" | "name">;

export function CampaignsPageClient({
  initialCampaigns,
  initialSegments,
}: {
  initialCampaigns: CampaignWithRecipients[];
  initialSegments: SegmentOption[];
}) {
  const [campaigns] = useState(initialCampaigns);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = campaigns.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.subject || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "SENT": return "badge badge-green";
      case "SCHEDULED": return "badge badge-blue";
      case "DRAFT": return "badge";
      case "FAILED": return "badge badge-red";
      default: return "badge";
    }
  };

  return (
    <AppShell>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Campaigns</span>
          <h2>Send to a filtered audience with snapshot-based recipients.</h2>
          <p>
            Campaigns should preview recipients before send, then keep delivery outcomes tied to the frozen audience snapshot.
          </p>
        </section>

        <section className="card form-section">
          <div className="card-header">
            <h3>Create Campaign Draft</h3>
          </div>
          <CampaignForm segments={initialSegments} />
        </section>

        <section className="card">
          <div className="card-header">
            <h3>All Campaigns</h3>
            <div className="filter-row">
              <div className="search-wrap">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="search"
                  placeholder="Search campaigns…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input"
                />
              </div>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-icon">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.86 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <p>{search || statusFilter !== "ALL" ? "No campaigns match your filters." : "No campaigns yet."}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>From</th>
                    <th>Recipients</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((campaign) => (
                    <tr key={campaign.id}>
                      <td className="primary-cell">{campaign.name}</td>
                      <td className="muted">{campaign.subject || "—"}</td>
                      <td><span className={statusBadgeClass(campaign.status)}>{campaign.status}</span></td>
                      <td>{campaign.fromEmail}</td>
                      <td>{campaign.recipients.length}</td>
                      <td className="muted">{new Date(campaign.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > 0 && (
            <p className="results-count">{filtered.length} campaign{filtered.length !== 1 ? "s" : ""}</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
