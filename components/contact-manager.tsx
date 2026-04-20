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
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [contactView, setContactView] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(true);
  const [listMessage, setListMessage] = useState<string | null>(null);

  const linkedContacts = contacts.filter((contact) => contact.company?.id).length;
  const reachableContacts = contacts.filter((contact) => contact.email || contact.phone).length;
  const activeContacts = contacts.filter((contact) => contact.status === "ACTIVE").length;
  const contactsWithoutEmail = contacts.filter((contact) => !contact.email).length;

  function upsertContact(contact: SavedContact) {
    setContacts((current) => {
      const existing = current.find((entry) => entry.id === contact.id);
      const merged = existing ? { ...existing, ...contact } : (contact as ContactWithCompany);
      return [merged, ...current.filter((entry) => entry.id !== contact.id)];
    });
    setListMessage("Contact saved.");
  }

  function removeContact(id: string) {
    setContacts((current) => current.filter((entry) => entry.id !== id));
    setListMessage("Contact deleted.");
  }

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const q = search.toLowerCase();
      const customText = customFieldsToPairs(c.customFieldsJson).map((pair) => `${pair.key} ${pair.value}`).join(" ").toLowerCase();
      const matchesSearch = (
        !q ||
        (c.fullName || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.company?.name || "").toLowerCase().includes(q) ||
        customText.includes(q)
      );
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchesView =
        contactView === "ALL" ||
        (contactView === "REACHABLE" && Boolean(c.email || c.phone)) ||
        (contactView === "NO_EMAIL" && !c.email) ||
        (contactView === "UNLINKED" && !c.company?.id);
      return matchesSearch && matchesStatus && matchesView;
    });
  }, [contacts, search, statusFilter, contactView]);

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

        <section className="stat-grid compact-stat-grid">
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{contacts.length}</div>
              <div className="stat-label">Contact Records</div>
              <div className="stat-desc">People stored in the working CRM dataset.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{activeContacts}</div>
              <div className="stat-label">Active</div>
              <div className="stat-desc">Contacts still available for normal outreach.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{linkedContacts}</div>
              <div className="stat-label">Company Linked</div>
              <div className="stat-desc">Contacts already tied to a company account.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{reachableContacts}</div>
              <div className="stat-label">Reachable</div>
              <div className="stat-desc">Contacts with at least one email or phone channel.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{contactsWithoutEmail}</div>
              <div className="stat-label">Missing Email</div>
              <div className="stat-desc">Contacts that cannot be used directly in email-driven outreach.</div>
            </div>
          </article>
        </section>

        <section className="card form-section collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>New Contact</h3>
              <p className="help">Create a contact only when you need one. Existing records stay below for cleanup and review.</p>
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
                    placeholder="Search by name, email, company, or custom field…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="search-input"
                  />
                </div>
                <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="ALL">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="UNSUBSCRIBED">Unsubscribed</option>
                  <option value="BOUNCED">Bounced</option>
                  <option value="INVALID">Invalid</option>
                  <option value="DO_NOT_CONTACT">Do not contact</option>
                </select>
                <select className="filter-select" value={contactView} onChange={(event) => setContactView(event.target.value)}>
                  <option value="ALL">All contact views</option>
                  <option value="REACHABLE">Reachable</option>
                  <option value="NO_EMAIL">Missing email</option>
                  <option value="UNLINKED">Unlinked company</option>
                </select>
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
                        <div className="record-summary-main">
                          <div className="record-summary-topline">
                            <h3>{contact.fullName || "Unnamed contact"}</h3>
                            <span className="badge">{contact.status}</span>
                          </div>
                          <p className="help">{contact.jobTitle || "No title"} · {contact.company?.name || "Unlinked company"}</p>
                          <div className="record-meta-row">
                            <span>{contact.email || "No email"}</span>
                            <span>{contact.phone || "No phone"}</span>
                            <span>{contact.source || "No source"}</span>
                          </div>
                        </div>
                        <div className="content-item-summary-right">
                          <span className="help">Edit or delete</span>
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
