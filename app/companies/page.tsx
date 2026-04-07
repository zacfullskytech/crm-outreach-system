import { AppShell } from "@/components/app-shell";
import { CompanyForm } from "@/components/company-form";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await prisma.company.findMany({
    include: { contacts: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <AppShell>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Companies</span>
          <h2>Anchor contacts to real businesses and target markets.</h2>
          <p>
            Company profiles hold geography, industry, and status so targeting rules stay consistent.
          </p>
        </section>
        <section className="card">
          <h3>Add Company</h3>
          <CompanyForm />
        </section>
        <section className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Industry</th>
                <th>Location</th>
                <th>Contacts</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={4}>No companies yet.</td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.name}</td>
                    <td>{company.industry || "Unspecified"}</td>
                    <td>{[company.city, company.state].filter(Boolean).join(", ") || "Unknown"}</td>
                    <td>{company.contacts.length}</td>
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
