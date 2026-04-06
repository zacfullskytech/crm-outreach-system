import { prisma } from "@/lib/db";

export async function getDashboardSummary() {
  const [contacts, companies, segments, campaigns, prospects, importJobs] = await Promise.all([
    prisma.contact.count(),
    prisma.company.count(),
    prisma.segment.count(),
    prisma.campaign.count(),
    prisma.prospect.count(),
    prisma.importJob.count(),
  ]);

  return {
    contacts,
    companies,
    segments,
    campaigns,
    prospects,
    importJobs,
  };
}
