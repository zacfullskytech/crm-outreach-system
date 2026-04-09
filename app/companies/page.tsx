import { requireAuth } from "@/lib/supabase/auth";
import { CompanyManager } from "@/components/company-manager";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const { appUser } = await requireAuth();

  const companies = await prisma.company.findMany({
    include: { contacts: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return <CompanyManager initialCompanies={companies} isAdmin={appUser.role === "admin"} />;
}
