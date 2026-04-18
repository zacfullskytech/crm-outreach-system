import { requireAuth } from "@/lib/supabase/auth";
import { AppShell } from "@/components/app-shell";
import { SettingsForm } from "@/components/settings-form";
import { SuppressionForm } from "@/components/suppression-form";
import { TagForm } from "@/components/tag-form";
import { prisma } from "@/lib/db";
import { getGeneralSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const envRows = [
  ["DATABASE_URL", "Primary PostgreSQL connection string"],
  ["DEFAULT_FROM_EMAIL", "Default sender email for campaigns"],
  ["DEFAULT_FROM_NAME", "Displayed sender name"],
  ["EMAIL_PROVIDER", "Outbound email provider slug"],
  ["EMAIL_WEBHOOK_SECRET", "Webhook verification secret"],
] as const;

export default async function SettingsPage() {
  const { appUser } = await requireAuth();

  const [settings, suppressions, tags] = await Promise.all([
    getGeneralSettings(),
    prisma.suppression.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, take: 100 }),
  ]);

  const providerMode = settings.emailProvider || "dry-run";

  return (
    <AppShell isAdmin={appUser.role === "admin"}>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Settings</span>
          <h2>Keep sender identity, target markets, and internal controls in one place.</h2>
          <p>
            This view is the operating panel for sender defaults, suppression management, and tag vocabulary.
          </p>
        </section>

        <section className="stat-grid compact-stat-grid">
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{providerMode}</div>
              <div className="stat-label">Email Provider</div>
              <div className="stat-desc">Current outbound mode for campaigns and tests.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{settings.targetStates.length}</div>
              <div className="stat-label">Target States</div>
              <div className="stat-desc">Configured geographies for prospecting and targeting defaults.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{suppressions.length}</div>
              <div className="stat-label">Suppressions</div>
              <div className="stat-desc">Addresses blocked from future outreach.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{tags.length}</div>
              <div className="stat-label">Tags</div>
              <div className="stat-desc">Shared label vocabulary across the CRM workspace.</div>
            </div>
          </article>
        </section>

        <section className="card">
          <h3>General Settings</h3>
          <SettingsForm initial={settings} />
        </section>

        <section className="card">
          <h3>Manual Suppression</h3>
          <SuppressionForm />
        </section>

        <section className="card">
          <h3>Suppression List</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Reason</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {suppressions.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No suppressions yet.</td>
                  </tr>
                ) : (
                  suppressions.map((suppression) => (
                    <tr key={suppression.id}>
                      <td>{suppression.email}</td>
                      <td><span className="badge">{suppression.reason}</span></td>
                      <td>{suppression.source || "Unknown"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="inline-grid mobile-card-list">
            {suppressions.length === 0 ? (
              <div className="dashboard-list-row mobile-record-card"><p>No suppressions yet.</p></div>
            ) : (
              suppressions.map((suppression) => (
                <div key={`${suppression.id}-mobile`} className="dashboard-list-row mobile-record-card">
                  <div className="record-summary-main">
                    <div className="record-summary-topline">
                      <strong>{suppression.email}</strong>
                      <span className="badge">{suppression.reason}</span>
                    </div>
                    <div className="record-meta-row">
                      <span>{suppression.source || "Unknown"}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card">
          <h3>Create Tag</h3>
          <TagForm />
        </section>

        <section className="card">
          <h3>Tag Library</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Color</th>
                </tr>
              </thead>
              <tbody>
                {tags.length === 0 ? (
                  <tr>
                    <td colSpan={2}>No tags yet.</td>
                  </tr>
                ) : (
                  tags.map((tag) => (
                    <tr key={tag.id}>
                      <td>{tag.name}</td>
                      <td>{tag.color || "None"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="inline-grid mobile-card-list">
            {tags.length === 0 ? (
              <div className="dashboard-list-row mobile-record-card"><p>No tags yet.</p></div>
            ) : (
              tags.map((tag) => (
                <div key={`${tag.id}-mobile`} className="dashboard-list-row mobile-record-card">
                  <div className="record-summary-main">
                    <div className="record-summary-topline">
                      <strong>{tag.name}</strong>
                      <span className="badge badge-blue">{tag.color || "None"}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card">
          <h3>Environment Requirements</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {envRows.map(([name, purpose]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="inline-grid mobile-card-list">
            {envRows.map(([name, purpose]) => (
              <div key={`${name}-mobile`} className="dashboard-list-row mobile-record-card">
                <div className="record-summary-main">
                  <div className="record-summary-topline">
                    <strong>{name}</strong>
                  </div>
                  <p className="help">{purpose}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
