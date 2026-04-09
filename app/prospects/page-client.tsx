"use client";

import { useState } from "react";
import { ProspectForm } from "@/components/prospect-form";
import { AppShell } from "@/components/app-shell";
import type { Prospect } from "@prisma/client";

export function ProspectsPageClient({ initialProspects, isAdmin }: { initialProspects: Prospect[]; isAdmin: boolean }) {
  const [prospects] = useState(initialProspects);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = prospects.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (p.companyName || "").toLowerCase().includes(q) ||
      (p.industry || "").toLowerCase().includes(q) ||
      (p.state || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "ALL" || p.qualificationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "QUALIFIED": return "badge badge-green";
      case "REJECTED": return "badge badge-red";
      case "REVIEWING": return "badge badge-yellow";
      default: return "badge";
    }
  };

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Prospects</span>
          <h2>Qualify net-new businesses before they enter outreach.</h2>
          <p>
            Prospects stay separate from client records until they are vetted, scored, and ready for conversion.
          </p>
        </section>

        <section className="card form-section">
          <div className="card-header">
            <h3>Add Prospect</h3>
          </div>
          <ProspectForm />
        </section>

        <section className="card">
          <div className="card-header">
            <h3>All Prospects</h3>
            <div className="filter-row">
              <div className="search-wrap">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="search"
                  placeholder="Search company, industry, state…"
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
                <option value="NEW">New</option>
                <option value="REVIEWING">Reviewing</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-icon">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <p>{search || statusFilter !== "ALL" ? "No prospects match your filters." : "No prospects yet."}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Industry</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((prospect) => (
                    <tr key={prospect.id}>
                      <td className="primary-cell">{prospect.companyName}</td>
                      <td>{prospect.industry || <span className="muted">—</span>}</td>
                      <td>{[prospect.city, prospect.state].filter(Boolean).join(", ") || <span className="muted">Unknown</span>}</td>
                      <td><span className={statusBadgeClass(prospect.qualificationStatus)}>{prospect.qualificationStatus}</span></td>
                      <td>
                        <span className="score-badge">{prospect.score ?? 0}</span>
                      </td>
                      <td className="muted">{new Date(prospect.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > 0 && (
            <p className="results-count">{filtered.length} prospect{filtered.length !== 1 ? "s" : ""}</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
