import { requireAuth } from "@/lib/supabase/auth";
import { CompaniesPageClient } from "./page-client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const { appUser } = await requireAuth();

  const companies = await prisma.company.findMany({
    include: { contacts: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return <CompaniesPageClient initialCompanies={companies} isAdmin={appUser.role === "admin"} />;
}
