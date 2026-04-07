import { AppShell } from "@/components/app-shell";
import { ProspectForm } from "@/components/prospect-form";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProspectsPage() {
  const prospects = await prisma.prospect.findMany({
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return (
    <AppShell>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Prospects</span>
          <h2>Qualify net-new businesses before they enter outreach.</h2>
          <p>
            Prospects stay separate from client records until they are vetted, scored, and ready for conversion.
          </p>
        </section>
        <section className="card">
          <h3>Add Prospect</h3>
          <ProspectForm />
        </section>
        <section className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Industry</th>
                <th>State</th>
                <th>Status</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {prospects.length === 0 ? (
                <tr>
                  <td colSpan={5}>No prospects yet.</td>
                </tr>
              ) : (
                prospects.map((prospect) => (
                  <tr key={prospect.id}>
                    <td>{prospect.companyName}</td>
                    <td>{prospect.industry || "Unspecified"}</td>
                    <td>{prospect.state || "Unknown"}</td>
                    <td><span className="badge">{prospect.qualificationStatus}</span></td>
                    <td>{prospect.score ?? 0}</td>
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
