import { AppShell } from "@/components/app-shell";
import { SegmentForm } from "@/components/segment-form";
import { prisma } from "@/lib/db";

export default async function SegmentsPage() {
  const segments = await prisma.segment.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <AppShell>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Segments</span>
          <h2>Store filters as reusable audience logic.</h2>
          <p>
            Segment definitions stay in JSON so the same logic can drive previews, campaigns, and prospect review queues.
          </p>
        </section>
        <section className="card">
          <h3>Create Segment</h3>
          <SegmentForm />
        </section>
        <section className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Entity</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {segments.length === 0 ? (
                <tr>
                  <td colSpan={3}>No segments yet.</td>
                </tr>
              ) : (
                segments.map((segment) => (
                  <tr key={segment.id}>
                    <td>{segment.name}</td>
                    <td>{segment.entityType}</td>
                    <td>{segment.description || "No description"}</td>
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
