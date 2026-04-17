import { prisma } from "@/lib/db";

function readServices(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [] as string[];
  }

  const raw = (value as Record<string, unknown>).services;
  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry)).filter(Boolean);
  }

  if (typeof raw === "string") {
    return raw.split(",").map((entry) => entry.trim()).filter(Boolean);
  }

  return [] as string[];
}

export async function getDashboardSummary() {
  const [
    contacts,
    reachableContacts,
    companies,
    companyRecords,
    segments,
    campaigns,
    scheduledCampaigns,
    sentCampaigns,
    failedCampaigns,
    prospects,
    newProspects,
    qualifiedProspects,
    importJobs,
    recentCampaigns,
    recentProspects,
    openOpportunities,
    followUpOpportunities,
    overduePipelineTasks,
    wonPendingDelivery,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.count({
      where: {
        OR: [{ email: { not: null } }, { phone: { not: null } }],
        status: { notIn: ["UNSUBSCRIBED", "BOUNCED", "INVALID", "DO_NOT_CONTACT"] },
      },
    }),
    prisma.company.count(),
    prisma.company.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        email: true,
        customFieldsJson: true,
        contacts: { select: { id: true } },
      },
      take: 500,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.segment.count(),
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: "SCHEDULED" } }),
    prisma.campaign.count({ where: { status: "SENT" } }),
    prisma.campaign.count({ where: { status: "FAILED" } }),
    prisma.prospect.count(),
    prisma.prospect.count({ where: { qualificationStatus: "NEW" } }),
    prisma.prospect.count({ where: { qualificationStatus: "QUALIFIED" } }),
    prisma.importJob.count(),
    prisma.campaign.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        scheduledAt: true,
        sentAt: true,
        _count: { select: { recipients: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.prospect.findMany({
      select: {
        id: true,
        companyName: true,
        qualificationStatus: true,
        score: true,
        city: true,
        state: true,
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.opportunity.count({ where: { status: "OPEN" } }),
    prisma.opportunity.count({ where: { stage: "FOLLOW_UP", status: "OPEN" } }),
    prisma.opportunityTask.count({ where: { status: { not: "DONE" }, dueDate: { lt: new Date() }, opportunity: { status: "OPEN" } } }),
    prisma.opportunity.count({ where: { status: "WON", deliveryStatus: { notIn: ["LIVE", "FOLLOW_UP_COMPLETE"] } } }),
  ]);

  const clientAccounts = companyRecords.filter((company) => company.status === "CLIENT");
  const clientsMissingInternet = clientAccounts.filter((company) => !readServices(company.customFieldsJson).includes("Internet")).length;
  const clientsMissingPhones = clientAccounts.filter((company) => !readServices(company.customFieldsJson).includes("Phones")).length;
  const companiesWithInbox = companyRecords.filter((company) => Boolean(company.email)).length;
  const companiesWithoutContacts = companyRecords.filter((company) => company.contacts.length === 0).length;

  return {
    contacts,
    reachableContacts,
    companies,
    segments,
    campaigns,
    scheduledCampaigns,
    sentCampaigns,
    failedCampaigns,
    prospects,
    newProspects,
    qualifiedProspects,
    importJobs,
    clientAccounts: clientAccounts.length,
    clientsMissingInternet,
    clientsMissingPhones,
    companiesWithInbox,
    companiesWithoutContacts,
    recentCampaigns,
    recentProspects,
    openOpportunities,
    followUpOpportunities,
    overduePipelineTasks,
    wonPendingDelivery,
  };
}
