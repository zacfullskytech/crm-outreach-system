import { requireAuth } from "@/lib/supabase/auth";
import { SegmentsPageClient } from "./page-client";
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

  return <SegmentsPageClient initialSegments={segments} fieldOptions={fieldOptions} isAdmin={appUser.role === "admin"} />;
}
