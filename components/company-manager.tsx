"use client";

import Link from "next/link";
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
  const [serviceGapFilter, setServiceGapFilter] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(true);
  const [listMessage, setListMessage] = useState<string | null>(null);

  const activeCompanies = companies.filter((company) => company.status !== "INACTIVE").length;
  const clientCompanies = companies.filter((company) => company.status === "CLIENT").length;
  const totalServices = companies.reduce((count, company) => count + readServices(company.customFieldsJson).length, 0);
  const companiesWithInbox = companies.filter((company) => company.email).length;
  const clientsMissingInternet = companies.filter((company) => company.status === "CLIENT" && !readServices(company.customFieldsJson).includes("Internet")).length;
  const clientsMissingPhones = companies.filter((company) => company.status === "CLIENT" && !readServices(company.customFieldsJson).includes("Phones")).length;

  function upsertCompany(company: SavedCompany) {
    setCompanies((current) => {
      const existing = current.find((entry) => entry.id === company.id);
      const merged = existing ? { ...existing, ...company } : (company as CompanyWithContacts);
      return [merged, ...current.filter((entry) => entry.id !== company.id)];
    });
    setListMessage("Company saved.");
  }

  function removeCompany(id: string) {
    setCompanies((current) => current.filter((entry) => entry.id !== id));
    setListMessage("Company deleted.");
  }

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    const customText = customFieldsToPairs(c.customFieldsJson).map((pair) => `${pair.key} ${pair.value}`).join(" ").toLowerCase();
    const services = readServices(c.customFieldsJson);
    const servicesText = services.join(" ").toLowerCase();
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
    const matchesServiceGap =
      serviceGapFilter === "ALL" ||
      (serviceGapFilter === "MISSING_INTERNET" && c.status === "CLIENT" && !services.includes("Internet")) ||
      (serviceGapFilter === "MISSING_PHONES" && c.status === "CLIENT" && !services.includes("Phones")) ||
      (serviceGapFilter === "HAS_COMPANY_EMAIL" && Boolean(c.email)) ||
      (serviceGapFilter === "NO_LINKED_CONTACTS" && (c.contacts?.length || 0) === 0);
    return matchesSearch && matchesStatus && matchesServiceGap;
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
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{companiesWithInbox}</div>
              <div className="stat-label">Shared Inbox</div>
              <div className="stat-desc">Companies with a general business email ready for fallback outreach.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{clientsMissingInternet}</div>
              <div className="stat-label">Clients Missing Internet</div>
              <div className="stat-desc">Current clients without Internet tagged in service coverage.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{clientsMissingPhones}</div>
              <div className="stat-label">Clients Missing Phones</div>
              <div className="stat-desc">Current clients without Phones tagged in service coverage.</div>
            </div>
          </article>
        </section>

        <section className="card form-section collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>New Company</h3>
              <p className="help">Create a company only when you need one. Existing accounts stay below for cleanup and review.</p>
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
            <div className="actions">
              {listMessage ? <span className="help">{listMessage}</span> : null}
              <button className="button secondary" type="button" onClick={() => setIsListOpen((value) => !value)}>
                {isListOpen ? "Collapse" : "Expand"}
              </button>
            </div>
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
                <select className="filter-select" value={serviceGapFilter} onChange={(event) => setServiceGapFilter(event.target.value)}>
                  <option value="ALL">All account views</option>
                  <option value="MISSING_INTERNET">Clients missing Internet</option>
                  <option value="MISSING_PHONES">Clients missing Phones</option>
                  <option value="HAS_COMPANY_EMAIL">Has company email</option>
                  <option value="NO_LINKED_CONTACTS">No linked contacts</option>
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
                    const isClientMissingInternet = company.status === "CLIENT" && !services.includes("Internet");
                    const isClientMissingPhones = company.status === "CLIENT" && !services.includes("Phones");
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
                            {services.length > 0 ? <p className="help">Services: {services.join(", ")}</p> : <p className="help">Services: none tagged yet</p>}
                            {(isClientMissingInternet || isClientMissingPhones) ? (
                              <p className="help">
                                Upsell gaps: {[isClientMissingInternet ? "Internet" : null, isClientMissingPhones ? "Phones" : null].filter(Boolean).join(", ")}
                              </p>
                            ) : null}
                          </div>
                          <div className="content-item-summary-right">
                            <span className="badge badge-blue">{services.length} service{services.length === 1 ? "" : "s"}</span>
                            <span className="help">Edit or delete</span>
                          </div>
                        </summary>
                        <div className="content-item-body inline-grid">
                          <div className="card subtle-card">
                            <div className="record-summary-main">
                              <div className="record-summary-topline">
                                <strong>Account snapshot</strong>
                                <span className="badge">{company.status}</span>
                              </div>
                              <div className="record-meta-row">
                                <span>{company.website || "No website"}</span>
                                <span>{company.source || "No source"}</span>
                                <span>{company.contacts?.length || 0} linked contact{company.contacts?.length === 1 ? "" : "s"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="actions">
                            <Link
                              className="button secondary"
                              href={`/pipeline?companyId=${company.id}&name=${encodeURIComponent(`${company.name} ${company.status === "CLIENT" ? "Upsell" : "Opportunity"}`)}&opportunityType=${company.status === "CLIENT" ? "UPSELL" : "NEW_SALE"}&serviceLine=${encodeURIComponent(isClientMissingInternet ? "Internet" : isClientMissingPhones ? "Phones" : services[0] || "")}&notes=${encodeURIComponent(company.status === "CLIENT" ? `Created from company account review. Coverage gaps: ${[isClientMissingInternet ? "Internet" : null, isClientMissingPhones ? "Phones" : null].filter(Boolean).join(", ") || "review existing services"}.` : "Created from company record.")}`}
                            >
                              Create Opportunity
                            </Link>
                          </div>
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
