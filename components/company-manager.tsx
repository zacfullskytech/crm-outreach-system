"use client";

import { useState } from "react";
import { CompanyForm } from "@/components/company-form";
import { AppShell } from "@/components/app-shell";
import { customFieldsToPairs } from "@/lib/custom-fields";
import type { Company } from "@prisma/client";

type CompanyWithContacts = Company & { contacts: { id: string }[] };

type SavedCompany = Partial<CompanyWithContacts> & { id: string; name: string };

function readServices(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [] as string[];
  }

  const raw = (value as Record<string, unknown>).services;
  if (typeof raw !== "string") {
    return [] as string[];
  }

  return raw.split(",").map((entry) => entry.trim()).filter(Boolean);
}

export function CompanyManager({ initialCompanies, isAdmin }: { initialCompanies: CompanyWithContacts[]; isAdmin: boolean }) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(true);
  const [isListOpen, setIsListOpen] = useState(true);

  const activeCompanies = companies.filter((company) => company.status !== "INACTIVE").length;
  const clientCompanies = companies.filter((company) => company.status === "CLIENT").length;
  const totalServices = companies.reduce((count, company) => count + readServices(company.customFieldsJson).length, 0);

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
    const servicesText = readServices(c.customFieldsJson).join(" ").toLowerCase();
    const matchesSearch = (
      !q ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.industry || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.state || "").toLowerCase().includes(q) ||
      servicesText.includes(q) ||
      customText.includes(q)
    );
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
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

        <section className="stat-grid compact-stat-grid">
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{companies.length}</div>
              <div className="stat-label">Company Records</div>
              <div className="stat-desc">Accounts currently stored in the CRM.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{clientCompanies}</div>
              <div className="stat-label">Clients</div>
              <div className="stat-desc">Companies currently marked as paying customers.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{activeCompanies}</div>
              <div className="stat-label">Active Accounts</div>
              <div className="stat-desc">Leads, prospects, and clients not marked inactive.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{totalServices}</div>
              <div className="stat-label">Service Tags</div>
              <div className="stat-desc">Service-line selections stored across company profiles.</div>
            </div>
          </article>
        </section>

        <section className="card form-section collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>Add Company</h3>
              <p className="help">Manually create and classify client and prospect accounts.</p>
            </div>
            <button className="button secondary" type="button" onClick={() => setIsCreateOpen((value) => !value)}>
              {isCreateOpen ? "Collapse" : "Expand"}
            </button>
          </div>
          {isCreateOpen ? <CompanyForm onSaved={upsertCompany} /> : null}
        </section>

        <section className="card collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>All Companies</h3>
              <p className="help">{filtered.length} compan{filtered.length === 1 ? "y" : "ies"} in view.</p>
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
                    placeholder="Search by name, industry, city, service, or custom field…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="search-input"
                  />
                </div>
                <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="ALL">All statuses</option>
                  <option value="CLIENT">Client</option>
                  <option value="LEAD">Lead</option>
                  <option value="PROSPECT">Prospect</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              {filtered.length === 0 ? (
                <div className="empty-state">
                  <p>{search ? "No companies match your search." : "No companies yet."}</p>
                </div>
              ) : (
                <div className="inline-grid">
                  {filtered.map((company) => {
                    const services = readServices(company.customFieldsJson);
                    return (
                      <details key={company.id} className="card content-item" open={false}>
                        <summary className="card-header content-item-summary">
                          <div className="record-summary-main">
                            <div className="record-summary-topline">
                              <h3>{company.name}</h3>
                              <span className="badge">{company.status}</span>
                            </div>
                            <p className="help">{company.industry || "No industry"} · {company.businessType || "No business type"}</p>
                            <div className="record-meta-row">
                              <span>{company.city || "Unknown city"}{company.state ? `, ${company.state}` : ""}</span>
                              <span>{company.phone || "No phone"}</span>
                              <span>{company.email || "No company email"}</span>
                              <span>{company.contacts?.length || 0} linked contact{company.contacts?.length === 1 ? "" : "s"}</span>
                            </div>
                            {services.length > 0 ? <p className="help">Services: {services.join(", ")}</p> : null}
                          </div>
                          <div className="content-item-summary-right">
                            <span className="help">Edit</span>
                          </div>
                        </summary>
                        <div className="content-item-body">
                          <CompanyForm company={company} onSaved={upsertCompany} onDeleted={removeCompany} submitLabel="Save Company" />
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
