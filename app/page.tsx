import Link from "next/link";
import { requireAuth } from "@/lib/supabase/auth";
import { AppShell } from "@/components/app-shell";
import { getDashboardSummary } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

const topStats = [
  { key: "newProspects", label: "New Prospects", desc: "Fresh leads waiting for triage and qualification." },
  { key: "qualifiedProspects", label: "Qualified Prospects", desc: "Approved leads that should be converted or contacted." },
  { key: "clientAccounts", label: "Client Accounts", desc: "Current customers available for retention and upsell work." },
  { key: "reachableContacts", label: "Reachable Contacts", desc: "Contacts with at least one usable outreach channel." },
  { key: "scheduledCampaigns", label: "Scheduled Campaigns", desc: "Campaigns already queued for a future send time." },
  { key: "failedCampaigns", label: "Failed Campaigns", desc: "Campaigns that need operator review or resend decisions." },
] as const;

const quickActions = [
  { href: "/prospects", title: "Review Prospect Queue", desc: "Work new and qualified prospects before the list grows stale." },
  { href: "/companies", title: "Find Upsell Targets", desc: "Inspect client accounts missing core service lines or shared inbox coverage." },
  { href: "/campaigns", title: "Build Campaign Draft", desc: "Create a send-ready draft from a segment and reusable content asset." },
  { href: "/marketing-content", title: "Create Sales Content", desc: "Generate acquisition and upsell content for current priorities." },
] as const;

export default async function HomePage() {
  const { appUser } = await requireAuth();
  const summary = await getDashboardSummary();

  return (
    <AppShell isAdmin={appUser.role === "admin"}>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Full Sky Technologies CRM</span>
          <h2>Run prospecting, account growth, and campaign execution from one operating view.</h2>
          <p>
            Version 1 should help you find new prospects, expand service coverage inside current accounts, and turn strong content into usable outreach quickly.
          </p>
        </section>

        <section className="stat-grid compact-stat-grid dashboard-stat-grid">
          {topStats.map((card) => (
            <article key={card.key} className="stat-card compact-stat-card">
              <div className="stat-body">
                <div className="stat-value">{summary[card.key]}</div>
                <div className="stat-label">{card.label}</div>
                <div className="stat-desc">{card.desc}</div>
              </div>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="card dashboard-panel">
            <div className="card-header dashboard-panel-header">
              <div>
                <h3>Quick Actions</h3>
                <p className="help">Start with the highest-value work for pipeline growth and account expansion.</p>
              </div>
            </div>
            <div className="dashboard-action-grid">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href} className="dashboard-action-card">
                  <strong>{action.title}</strong>
                  <span>{action.desc}</span>
                </Link>
              ))}
            </div>
          </article>

          <article className="card dashboard-panel">
            <div className="card-header dashboard-panel-header">
              <div>
                <h3>Upsell Signals</h3>
                <p className="help">Use company coverage gaps to prioritize expansion inside current client accounts.</p>
              </div>
            </div>
            <div className="dashboard-mini-stats">
              <div className="dashboard-mini-stat">
                <strong>{summary.clientsMissingInternet}</strong>
                <span>Clients missing Internet</span>
              </div>
              <div className="dashboard-mini-stat">
                <strong>{summary.clientsMissingPhones}</strong>
                <span>Clients missing Phones</span>
              </div>
              <div className="dashboard-mini-stat">
                <strong>{summary.companiesWithInbox}</strong>
                <span>Companies with shared inbox</span>
              </div>
              <div className="dashboard-mini-stat">
                <strong>{summary.companiesWithoutContacts}</strong>
                <span>Companies missing named contacts</span>
              </div>
            </div>
          </article>

          <article className="card dashboard-panel">
            <div className="card-header dashboard-panel-header">
              <div>
                <h3>Recent Prospect Focus</h3>
                <p className="help">Highest-scoring recent prospects that should move through review or conversion next.</p>
              </div>
              <Link href="/prospects" className="button secondary">Open Prospects</Link>
            </div>
            <div className="inline-grid">
              {summary.recentProspects.map((prospect) => (
                <div key={prospect.id} className="dashboard-list-row">
                  <div className="record-summary-main">
                    <div className="record-summary-topline">
                      <strong>{prospect.companyName}</strong>
                      <span className="badge">{prospect.qualificationStatus}</span>
                    </div>
                    <div className="record-meta-row">
                      <span>{prospect.city || "Unknown city"}{prospect.state ? `, ${prospect.state}` : ""}</span>
                      <span>score {prospect.score ?? 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card dashboard-panel">
            <div className="card-header dashboard-panel-header">
              <div>
                <h3>Campaign Pipeline</h3>
                <p className="help">Keep visibility on what is drafted, scheduled, and already sent.</p>
              </div>
              <Link href="/campaigns" className="button secondary">Open Campaigns</Link>
            </div>
            <div className="inline-grid">
              {summary.recentCampaigns.map((campaign) => (
                <div key={campaign.id} className="dashboard-list-row">
                  <div className="record-summary-main">
                    <div className="record-summary-topline">
                      <strong>{campaign.name}</strong>
                      <span className="badge">{campaign.status}</span>
                    </div>
                    <div className="record-meta-row">
                      <span>{campaign._count.recipients} recipients</span>
                      <span>{campaign.scheduledAt ? `Scheduled ${new Date(campaign.scheduledAt).toLocaleString()}` : campaign.sentAt ? `Sent ${new Date(campaign.sentAt).toLocaleString()}` : "Not scheduled"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
