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

        <section className="card form-section collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>Create Segment</h3>
              <p className="help">Build reusable audience rules for contacts, companies, or prospects.</p>
            </div>
          </div>
          <SegmentForm fieldOptions={fieldOptions} />
        </section>

        <section className="card collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>All Segments</h3>
              <p className="help">{segments.length} segment{segments.length === 1 ? "" : "s"} saved.</p>
            </div>
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
            <div className="inline-grid">
              {segments.map((segment) => {
                const rules = (segment.filterJson as { rules?: unknown[] })?.rules ?? [];
                return (
                  <details key={segment.id} className="card content-item" open={false}>
                    <summary className="card-header content-item-summary">
                      <div>
                        <h3>{segment.name}</h3>
                        <p className="help">{segment.description || "No description"}</p>
                        <p className="help">{rules.length} rule{rules.length !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="content-item-summary-right">
                        <span className="badge">{segment.entityType}</span>
                        <span className="help">Edit</span>
                      </div>
                    </summary>
                    <div className="content-item-body">
                      <SegmentForm fieldOptions={fieldOptions} segment={segment} submitLabel="Save Segment" />
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
