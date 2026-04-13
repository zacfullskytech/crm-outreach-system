"use client";

import { useState } from "react";
import { CompanyForm } from "@/components/company-form";
import { AppShell } from "@/components/app-shell";
import { customFieldsToPairs } from "@/lib/custom-fields";
import type { Company } from "@prisma/client";

type CompanyWithContacts = Company & { contacts: { id: string }[] };

type SavedCompany = Partial<CompanyWithContacts> & { id: string; name: string };

export function CompanyManager({ initialCompanies, isAdmin }: { initialCompanies: CompanyWithContacts[]; isAdmin: boolean }) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [search, setSearch] = useState("");

  function upsertCompany(company: SavedCompany) {
    setCompanies((current) => {
      const existing = current.find((entry) => entry.id === company.id);
      const merged = existing ? { ...existing, ...company } : (company as CompanyWithContacts);
      return [merged, ...current.filter((entry) => entry.id !== company.id)];
    });
  }

  function removeCompany(id: string) {
    setCompanies((current) => current.filter((entry) => entry.id !== id));
  }

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    const customText = customFieldsToPairs(c.customFieldsJson).map((pair) => `${pair.key} ${pair.value}`).join(" ").toLowerCase();
    const servicesText = Array.isArray(c.servicesJson) ? c.servicesJson.map((value) => String(value)).join(" ").toLowerCase() : "";
    return (
      !q ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.industry || "").toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.state || "").toLowerCase().includes(q) ||
      servicesText.includes(q) ||
      customText.includes(q)
    );
  });

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Companies</span>
          <h2>Anchor contacts to real businesses and target markets.</h2>
          <p>
            Company profiles hold geography, industry, status, and your own internal classification fields.
          </p>
        </section>

        <section className="card form-section">
          <div className="card-header">
            <h3>Add Company</h3>
          </div>
          <CompanyForm onSaved={upsertCompany} />
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
                placeholder="Search by name, industry, city, or custom field…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>{search ? "No companies match your search." : "No companies yet."}</p>
            </div>
          ) : (
            <div className="inline-grid">
              {filtered.map((company) => (
                <section key={company.id} className="card">
                  <div className="card-header">
                    <div>
                      <h3>{company.name}</h3>
                      <p className="help">{company.industry || "No industry"} · {company.city || "Unknown city"}{company.state ? `, ${company.state}` : ""}</p>
                      {Array.isArray(company.servicesJson) && company.servicesJson.length > 0 ? (
                        <p className="help">Services: {company.servicesJson.map((value) => String(value)).join(", ")}</p>
                      ) : null}
                    </div>
                    <span className="badge">{company.status}</span>
                  </div>
                  <CompanyForm company={company} onSaved={upsertCompany} onDeleted={removeCompany} submitLabel="Save Company" />
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
