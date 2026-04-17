import { requireAuth } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";
import { ensurePipelineTemplates } from "@/lib/pipeline";
import { PipelineManager } from "@/components/pipeline-manager";

export const dynamic = "force-dynamic";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { appUser } = await requireAuth();
  await ensurePipelineTemplates(appUser.id);
  const params = await searchParams;

  const [opportunities, templates, users, companies, contacts] = await Promise.all([
    prisma.opportunity.findMany({
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, fullName: true, email: true } },
        owner: { select: { id: true, email: true, name: true } },
        template: { select: { id: true, name: true, serviceLine: true } },
        tasks: {
          include: { assignee: { select: { id: true, email: true, name: true } } },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    }),
    prisma.opportunityTemplate.findMany({ where: { isActive: true }, orderBy: [{ name: "asc" }] }),
    prisma.user.findMany({ select: { id: true, email: true, name: true }, orderBy: [{ email: "asc" }] }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: [{ name: "asc" }], take: 300 }),
    prisma.contact.findMany({ select: { id: true, fullName: true, email: true, companyId: true }, orderBy: [{ fullName: "asc" }], take: 300 }),
  ]);

  return (
    <PipelineManager
      initialOpportunities={opportunities}
      initialTemplates={templates}
      initialUsers={users}
      initialCompanies={companies}
      initialContacts={contacts}
      initialDraft={{
        name: typeof params.name === "string" ? params.name : undefined,
        companyId: typeof params.companyId === "string" ? params.companyId : undefined,
        contactId: typeof params.contactId === "string" ? params.contactId : undefined,
        opportunityType: typeof params.opportunityType === "string" ? params.opportunityType : undefined,
        serviceLine: typeof params.serviceLine === "string" ? params.serviceLine : undefined,
        notes: typeof params.notes === "string" ? params.notes : undefined,
      }}
      isAdmin={appUser.role === "admin"}
    />
  );
}
