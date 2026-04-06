import { AppShell } from "@/components/app-shell";
import { ImportWizard } from "@/components/import-wizard";
import { prisma } from "@/lib/db";

export default async function ImportsPage() {
  const importJobs = await prisma.importJob.findMany({
    include: { rows: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <AppShell>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Imports</span>
          <h2>Map CSV columns before they become database records.</h2>
          <p>
            Import jobs should preview source data, track mappings, and summarize how many rows turned into usable CRM records.
          </p>
        </section>
        <section className="card">
          <h3>Import Wizard</h3>
          <ImportWizard />
        </section>
        <section className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Imported</th>
              </tr>
            </thead>
            <tbody>
              {importJobs.length === 0 ? (
                <tr>
                  <td colSpan={4}>No imports yet.</td>
                </tr>
              ) : (
                importJobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.filename}</td>
                    <td><span className="badge">{job.status}</span></td>
                    <td>{job.rowCount ?? 0}</td>
                    <td>{job.rows.length}</td>
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
