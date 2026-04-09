import { requireAuth } from "@/lib/supabase/auth";
import { ProspectsPageClient } from "./page-client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProspectsPage() {
  await requireAuth();

  const prospects = await prisma.prospect.findMany({
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return <ProspectsPageClient initialProspects={prospects} />;
}
