import { requireAuth } from "@/lib/supabase/auth";
import { SegmentForm } from "@/components/segment-form";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { buildSegmentFieldOptions } from "@/lib/segment-fields";

export const dynamic = "force-dynamic";

export default async function SegmentsPage() {
  const { appUser } = await requireAuth();

  const [segments, contacts, companies] = await Promise.all([
    prisma.segment.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.contact.findMany({
      select: { customFieldsJson: true },
      take: 200,
    }),
    prisma.company.findMany({
      select: { customFieldsJson: true },
      take: 200,
    }),
  ]);

  const contactCustomKeys = Array.from(
    new Set(
      contacts.flatMap((contact) =>
        contact.customFieldsJson && typeof contact.customFieldsJson === "object" && !Array.isArray(contact.customFieldsJson)
          ? Object.keys(contact.customFieldsJson as Record<string, unknown>)
          : [],
      ),
    ),
  ).sort();

  const companyCustomKeys = Array.from(
    new Set(
      companies.flatMap((company) =>
        company.customFieldsJson && typeof company.customFieldsJson === "object" && !Array.isArray(company.customFieldsJson)
          ? Object.keys(company.customFieldsJson as Record<string, unknown>)
          : [],
      ),
    ),
  ).sort();

  const fieldOptions = buildSegmentFieldOptions({ contactCustomKeys, companyCustomKeys });

  return (
    <AppShell isAdmin={appUser.role === "admin"}>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Segments</span>
          <h2>Store filters as reusable audience logic.</h2>
          <p>
            Segment definitions stay in JSON so the same logic can drive previews, campaigns, and prospect review queues.
          </p>
        </section>

        <section className="card form-section">
          <div className="card-header">
            <h3>Create Segment</h3>
          </div>
          <SegmentForm fieldOptions={fieldOptions} />
        </section>

        <section className="card">
          <div className="card-header">
            <h3>All Segments</h3>
          </div>

          {segments.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-icon">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12l2 2 4-4" />
              </svg>
              <p>No segments yet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Entity</th>
                    <th>Description</th>
                    <th>Rules</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map((segment) => {
                    const rules = (segment.filterJson as { rules?: unknown[] })?.rules ?? [];
                    return (
                      <tr key={segment.id}>
                        <td className="primary-cell">{segment.name}</td>
                        <td><span className="badge">{segment.entityType}</span></td>
                        <td className="muted">{segment.description || "—"}</td>
                        <td className="muted">{rules.length} rule{rules.length !== 1 ? "s" : ""}</td>
                        <td className="muted">{new Date(segment.createdAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
