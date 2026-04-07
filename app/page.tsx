import { AppShell } from "@/components/app-shell";
import { getDashboardSummary } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

const cardLabels = [
  ["Contacts", "contacts"],
  ["Companies", "companies"],
  ["Segments", "segments"],
  ["Campaigns", "campaigns"],
  ["Prospects", "prospects"],
  ["Imports", "importJobs"],
] as const;

export default async function HomePage() {
  const summary = await getDashboardSummary();

  return (
    <AppShell>
      <section className="hero">
        <span className="kicker">CRM Blueprint</span>
        <h2>Outbound CRM for veterinary and private practice markets.</h2>
        <p>
          This build centers on importable contact data, reusable segments, campaign execution,
          and a separate prospect pipeline for net-new business development.
        </p>
      </section>
      <section className="grid">
        {cardLabels.map(([title, key]) => (
          <article key={title} className="card">
            <span className="kicker">{title}</span>
            <h3>{summary[key]}</h3>
            <p>Current records in the system.</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
