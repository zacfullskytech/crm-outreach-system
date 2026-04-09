"use client";

import { useState } from "react";
import { CompanyForm } from "@/components/company-form";
import { AppShell } from "@/components/app-shell";
import type { Company } from "@prisma/client";

type CompanyWithContacts = Company & { contacts: { id: string }[] };

export function CompaniesPageClient({ initialCompanies, isAdmin }: { initialCompanies: CompanyWithContacts[]; isAdmin: boolean }) {
  const [companies] = useState(initialCompanies);
  const [search, setSearch] = useState("");

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.industry || "").toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.state || "").toLowerCase().includes(q)
    );
  });

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Companies</span>
          <h2>Anchor contacts to real businesses and target markets.</h2>
          <p>
            Company profiles hold geography, industry, and status so targeting rules stay consistent.
          </p>
        </section>

        <section className="card form-section">
          <div className="card-header">
            <h3>Add Company</h3>
          </div>
          <CompanyForm />
        </section>

        <section className="card">
          <div className="card-header">
            <h3>All Companies</h3>
            <div className="search-wrap">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="search"
                placeholder="Search by name, industry, city…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-icon">
                <path d="M3 21h18" />
                <path d="M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1" />
                <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
              </svg>
              <p>{search ? "No companies match your search." : "No companies yet."}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Industry</th>
                    <th>Location</th>
                    <th>Contacts</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((company) => (
                    <tr key={company.id}>
                      <td className="primary-cell">{company.name}</td>
                      <td>{company.industry || <span className="muted">—</span>}</td>
                      <td>{[company.city, company.state].filter(Boolean).join(", ") || <span className="muted">Unknown</span>}</td>
                      <td>{company.contacts.length}</td>
                      <td><span className="badge">{company.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {search && filtered.length > 0 && (
            <p className="results-count">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
