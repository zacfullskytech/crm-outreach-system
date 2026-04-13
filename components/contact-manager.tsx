"use client";

import { useMemo, useState } from "react";
import { ContactForm } from "@/components/contact-form";
import { AppShell } from "@/components/app-shell";
import { customFieldsToPairs } from "@/lib/custom-fields";
import type { Contact, Company } from "@prisma/client";

type ContactWithCompany = Contact & { company: Pick<Company, "id" | "name"> | null };

type CompanyOption = Pick<Company, "id" | "name">;
type SavedContact = Partial<ContactWithCompany> & { id: string };

export function ContactManager({
  initialContacts,
  initialCompanies,
  isAdmin,
}: {
  initialContacts: ContactWithCompany[];
  initialCompanies: CompanyOption[];
  isAdmin: boolean;
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(true);
  const [isListOpen, setIsListOpen] = useState(true);

  function upsertContact(contact: SavedContact) {
    setContacts((current) => {
      const existing = current.find((entry) => entry.id === contact.id);
      const merged = existing ? { ...existing, ...contact } : (contact as ContactWithCompany);
      return [merged, ...current.filter((entry) => entry.id !== contact.id)];
    });
  }

  function removeContact(id: string) {
    setContacts((current) => current.filter((entry) => entry.id !== id));
  }

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const q = search.toLowerCase();
      const customText = customFieldsToPairs(c.customFieldsJson).map((pair) => `${pair.key} ${pair.value}`).join(" ").toLowerCase();
      return (
        !q ||
        (c.fullName || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.company?.name || "").toLowerCase().includes(q) ||
        customText.includes(q)
      );
    });
  }, [contacts, search]);

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Contacts</span>
          <h2>Manage people, not loose rows in a spreadsheet.</h2>
          <p>
            Contacts stay linked to companies and now support your own internal classification fields for filtering and operations.
          </p>
        </section>

        <section className="card form-section collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>Add Contact</h3>
              <p className="help">Manually add new people and keep them linked to the right company.</p>
            </div>
            <button className="button secondary" type="button" onClick={() => setIsCreateOpen((value) => !value)}>
              {isCreateOpen ? "Collapse" : "Expand"}
            </button>
          </div>
          {isCreateOpen ? <ContactForm companies={initialCompanies} onSaved={upsertContact} /> : null}
        </section>

        <section className="card collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>All Contacts</h3>
              <p className="help">{filtered.length} contact{filtered.length === 1 ? "" : "s"} in view.</p>
            </div>
            <button className="button secondary" type="button" onClick={() => setIsListOpen((value) => !value)}>
              {isListOpen ? "Collapse" : "Expand"}
            </button>
          </div>
          {isListOpen ? (
            <>
              <div className="search-wrap">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="search"
                  placeholder="Search by name, email, company, or custom field…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input"
                />
              </div>

              {filtered.length === 0 ? (
                <div className="empty-state">
                  <p>{search ? "No contacts match your search." : "No contacts yet."}</p>
                </div>
              ) : (
                <div className="inline-grid">
                  {filtered.map((contact) => (
                    <details key={contact.id} className="card content-item" open={false}>
                      <summary className="card-header content-item-summary">
                        <div>
                          <h3>{contact.fullName || "Unnamed contact"}</h3>
                          <p className="help">{contact.email || "No email"} · {contact.company?.name || "Unlinked company"}</p>
                        </div>
                        <div className="content-item-summary-right">
                          <span className="badge">{contact.status}</span>
                          <span className="help">Edit</span>
                        </div>
                      </summary>
                      <div className="content-item-body">
                        <ContactForm
                          companies={initialCompanies}
                          contact={contact}
                          onSaved={upsertContact}
                          onDeleted={removeContact}
                          submitLabel="Save Contact"
                        />
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
