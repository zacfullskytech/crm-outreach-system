import { requireAuth } from "@/lib/supabase/auth";
import { AppShell } from "@/components/app-shell";
import { ImportWizard } from "@/components/import-wizard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const { appUser } = await requireAuth();

  const importJobs = await prisma.importJob.findMany({
    include: { rows: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalRows = importJobs.reduce((count, job) => count + (job.rowCount ?? 0), 0);
  const importedRows = importJobs.reduce((count, job) => count + job.rows.length, 0);
  const completedJobs = importJobs.filter((job) => job.status.toLowerCase() === "completed").length;

  return (
    <AppShell isAdmin={appUser.role === "admin"}>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Imports</span>
          <h2>Map CSV columns before they become database records.</h2>
          <p>
            Import jobs should preview source data, track mappings, and summarize how many rows turned into usable CRM records.
          </p>
        </section>

        <section className="stat-grid compact-stat-grid">
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{importJobs.length}</div>
              <div className="stat-label">Import Jobs</div>
              <div className="stat-desc">Saved import runs and mapping attempts.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{completedJobs}</div>
              <div className="stat-label">Completed</div>
              <div className="stat-desc">Import jobs that finished successfully.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{totalRows}</div>
              <div className="stat-label">Source Rows</div>
              <div className="stat-desc">Rows uploaded across recent import jobs.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{importedRows}</div>
              <div className="stat-label">Rows Written</div>
              <div className="stat-desc">Rows currently represented in import row records.</div>
            </div>
          </article>
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
