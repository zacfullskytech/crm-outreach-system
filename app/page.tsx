import { requireAuth } from "@/lib/supabase/auth";
import { AppShell } from "@/components/app-shell";
import { getDashboardSummary } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

const statCards = [
  {
    key: "contacts",
    label: "Contacts",
    desc: "People in your outreach database",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "companies",
    label: "Companies",
    desc: "Businesses anchoring your contacts",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M9 8h1" />
        <path d="M9 12h1" />
        <path d="M9 16h1" />
        <path d="M14 8h1" />
        <path d="M14 12h1" />
        <path d="M14 16h1" />
        <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
      </svg>
    ),
  },
  {
    key: "segments",
    label: "Segments",
    desc: "Reusable audience filters",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    key: "campaigns",
    label: "Campaigns",
    desc: "Email sends with tracked outcomes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.86 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  {
    key: "prospects",
    label: "Prospects",
    desc: "Net-new leads in the qualification funnel",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    key: "importJobs",
    label: "Imports",
    desc: "Bulk imports processed",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
] as const;

export default async function HomePage() {
  await requireAuth();
  const summary = await getDashboardSummary();

  return (
    <AppShell>
      <section className="hero">
        <span className="kicker">Full Sky Technologies CRM</span>
        <h2>Outbound CRM for veterinary and private practice markets.</h2>
        <p>
          Manage contacts, build targeted segments, and run email campaigns — all in one place.
        </p>
      </section>

      <section className="stat-grid">
        {statCards.map((card) => (
          <article key={card.key} className="stat-card">
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-body">
              <div className="stat-value">{summary[card.key]}</div>
              <div className="stat-label">{card.label}</div>
              <div className="stat-desc">{card.desc}</div>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
