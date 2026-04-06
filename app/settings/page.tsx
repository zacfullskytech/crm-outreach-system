import { AppShell } from "@/components/app-shell";

const envRows = [
  ["DATABASE_URL", "Primary PostgreSQL connection string"],
  ["DEFAULT_FROM_EMAIL", "Default sender email for campaigns"],
  ["DEFAULT_FROM_NAME", "Displayed sender name"],
  ["EMAIL_PROVIDER", "Outbound email provider slug"],
  ["EMAIL_WEBHOOK_SECRET", "Webhook verification secret"],
] as const;

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Settings</span>
          <h2>Keep sender identity, target markets, and internal controls in one place.</h2>
          <p>
            Start with environment-backed configuration, then move high-value operational settings into the database.
          </p>
        </section>
        <section className="card">
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
        </section>
      </div>
    </AppShell>
  );
}
