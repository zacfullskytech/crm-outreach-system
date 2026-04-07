import { AppShell } from "@/components/app-shell";
import { CampaignForm } from "@/components/campaign-form";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const [campaigns, segments] = await Promise.all([
    prisma.campaign.findMany({
      include: { recipients: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.segment.findMany({
      select: { id: true, name: true },
      where: { entityType: "contact" },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <AppShell>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Campaigns</span>
          <h2>Send to a filtered audience with snapshot-based recipients.</h2>
          <p>
            Campaigns should preview recipients before send, then keep delivery outcomes tied to the frozen audience snapshot.
          </p>
        </section>
        <section className="card">
          <h3>Create Campaign Draft</h3>
          <CampaignForm segments={segments} />
        </section>
        <section className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>From</th>
                <th>Recipients</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={4}>No campaigns yet.</td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>{campaign.name}</td>
                    <td><span className="badge">{campaign.status}</span></td>
                    <td>{campaign.fromEmail}</td>
                    <td>{campaign.recipients.length}</td>
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
