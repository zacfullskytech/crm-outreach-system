"use client";

import { useState } from "react";
import { ContactForm } from "@/components/contact-form";
import { AppShell } from "@/components/app-shell";
import type { Contact, Company } from "@prisma/client";

type ContactWithCompany = Contact & { company: Pick<Company, "id" | "name"> | null };

async function getData() {
  const [contacts, companies] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_APP_BASE_URL || ""}/api/contacts`).then((r) => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_APP_BASE_URL || ""}/api/companies`).then((r) => r.json()),
  ]);
  return { contacts: contacts.data ?? [], companies: companies.data ?? [] };
}

export function ContactsPageClient({
  initialContacts,
  initialCompanies,
  isAdmin,
}: {
  initialContacts: ContactWithCompany[];
  initialCompanies: Pick<Company, "id" | "name">[];
  isAdmin: boolean;
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [search, setSearch] = useState("");

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (c.fullName || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.company?.name || "").toLowerCase().includes(q)
    );
  });

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Contacts</span>
          <h2>Manage people, not loose rows in a spreadsheet.</h2>
          <p>
            Contacts are linked to companies, carry delivery status, and become the audience for campaigns.
          </p>
        </section>

        <section className="card form-section">
          <div className="card-header">
            <h3>Add Contact</h3>
          </div>
          <ContactForm companies={initialCompanies} />
        </section>

        <section className="card">
          <div className="card-header">
            <h3>All Contacts</h3>
            <div className="search-wrap">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="search"
                placeholder="Search by name, email, or company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-icon">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p>{search ? "No contacts match your search." : "No contacts yet."}</p>
            </div>
          ) : (
            <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((contact) => (
                    <tr key={contact.id}>
                      <td className="primary-cell">{contact.fullName || [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "—"}</td>
                      <td>{contact.email || <span className="muted">No email</span>}</td>
                      <td>{contact.company?.name || <span className="muted">Unlinked</span>}</td>
                      <td><span className="badge">{contact.status}</span></td>
                      <td className="muted">{new Date(contact.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="inline-grid mobile-card-list">
              {filtered.map((contact) => (
                <div key={`${contact.id}-mobile`} className="dashboard-list-row mobile-record-card">
                  <div className="record-summary-main">
                    <div className="record-summary-topline">
                      <strong>{contact.fullName || [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "—"}</strong>
                      <span className="badge">{contact.status}</span>
                    </div>
                    <div className="record-meta-row">
                      <span>{contact.email || "No email"}</span>
                      <span>{contact.company?.name || "Unlinked"}</span>
                      <span>Added {new Date(contact.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
          {search && filtered.length > 0 && (
            <p className="results-count">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
