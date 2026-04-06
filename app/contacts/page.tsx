import { AppShell } from "@/components/app-shell";
import { ContactForm } from "@/components/contact-form";
import { prisma } from "@/lib/db";

export default async function ContactsPage() {
  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({
      include: { company: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  return (
    <AppShell>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Contacts</span>
          <h2>Manage people, not loose rows in a spreadsheet.</h2>
          <p>
            Contacts are linked to companies, carry delivery status, and become the audience for campaigns.
          </p>
        </section>
        <section className="card">
          <h3>Add Contact</h3>
          <ContactForm companies={companies} />
        </section>
        <section className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={4}>No contacts yet.</td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>{contact.fullName || [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unnamed"}</td>
                    <td>{contact.email || "No email"}</td>
                    <td>{contact.company?.name || "Unlinked"}</td>
                    <td><span className="badge">{contact.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
