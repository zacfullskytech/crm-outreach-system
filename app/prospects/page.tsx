import { requireAuth } from "@/lib/supabase/auth";
import { ProspectsPageClient } from "./page-client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProspectsPage() {
  const { appUser } = await requireAuth();

  const [prospects, jobs, candidates] = await Promise.all([
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
  ]);

  return (
    <ProspectsPageClient
      initialProspects={prospects}
      initialJobs={jobs}
      initialCandidates={candidates}
      isAdmin={appUser.role === "admin"}
    />
  );
}
