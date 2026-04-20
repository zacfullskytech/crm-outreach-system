import { requireAuth } from "@/lib/supabase/auth";
import { ProspectsPageClient } from "./page-client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProspectsPage() {
  const { appUser } = await requireAuth();

  const [prospects, jobs, candidates, automations] = await Promise.all([
    prisma.prospect.findMany({
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.prospectSearchJob.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        _count: { select: { candidates: true, prospects: true } },
      },
      take: 25,
    }),
    prisma.prospectCandidate.findMany({
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.prospectAutomation.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 25,
    }),
  ]);

  return (
    <ProspectsPageClient
      initialProspects={prospects}
      initialJobs={jobs}
      initialCandidates={candidates}
      initialAutomations={automations}
      isAdmin={appUser.role === "admin"}
    />
  );
}
