import { prisma } from "@/lib/db";
import { discoverProspectCandidates, findProspectMatch, scoreProspectCandidate } from "@/lib/prospecting";

type AutomationRecord = {
  id: string;
  name: string;
  industry: string | null;
  geographyJson: unknown;
  includeKeywordsJson: unknown;
  excludeKeywordsJson: unknown;
  companyTypesJson: unknown;
  notes: string | null;
  realDataOnly: boolean;
  requireEmail: boolean;
  preferBusinessEmail: boolean;
  minimumScore: number | null;
  maxResultsPerRun: number | null;
  scheduleType: string;
  scheduleHourLocal: number;
  scheduleMinuteLocal: number;
  timezone: string;
  isActive: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdById: string | null;
};

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0) : [];
}

export function computeNextAutomationRun(input: {
  scheduleType: string;
  scheduleHourLocal: number;
  scheduleMinuteLocal: number;
}, now = new Date()) {
  const next = new Date(now);
  next.setUTCSeconds(0, 0);
  next.setUTCHours(input.scheduleHourLocal, input.scheduleMinuteLocal, 0, 0);

  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  if (input.scheduleType === "weekdays") {
    while (next.getUTCDay() === 0 || next.getUTCDay() === 6) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
  }

  return next;
}

export async function runProspectAutomation(automation: AutomationRecord) {
  const geography = readStringArray(automation.geographyJson);
  const includeKeywords = readStringArray(automation.includeKeywordsJson);
  const excludeKeywords = readStringArray(automation.excludeKeywordsJson);
  const companyTypes = readStringArray(automation.companyTypesJson);

  const discovery = await discoverProspectCandidates({
    industry: automation.industry,
    geography,
    includeKeywords,
    excludeKeywords,
    companyTypes,
  });

  let candidates = discovery.candidates;

  if (automation.requireEmail) {
    candidates = candidates.filter((candidate) => Boolean(candidate.email));
  }

  if (automation.minimumScore != null) {
    candidates = candidates.filter((candidate) => scoreProspectCandidate(candidate) >= automation.minimumScore!);
  }

  candidates = candidates
    .sort((a, b) => scoreProspectCandidate(b) - scoreProspectCandidate(a))
    .slice(0, automation.maxResultsPerRun || 30);

  const job = await prisma.prospectSearchJob.create({
    data: {
      name: automation.name,
      industry: automation.industry,
      geographyJson: geography,
      includeKeywords: includeKeywords,
      excludeKeywords: excludeKeywords,
      companyTypesJson: companyTypes,
      notes: automation.notes,
      realDataOnly: automation.realDataOnly,
      automationId: automation.id,
      lastRunAt: new Date(),
      lastDiscoveryMode: discovery.mode,
      status: discovery.mode === "blocked" ? "FAILED" : "RUNNING",
      createdById: automation.createdById,
    },
  });

  let importedCount = 0;
  for (const seed of candidates) {
    const score = scoreProspectCandidate(seed);
    const match = await findProspectMatch(seed);

    await prisma.prospectCandidate.create({
      data: {
        searchJobId: job.id,
        companyName: seed.companyName,
        contactName: seed.contactName,
        email: seed.email,
        phone: seed.phone,
        website: seed.website,
        industry: seed.industry,
        businessType: seed.businessType,
        city: seed.city,
        state: seed.state,
        source: seed.source,
        sourceUrl: seed.sourceUrl,
        evidenceJson: seed.evidenceJson,
        extractionJson: {
          automationId: automation.id,
          automationName: automation.name,
          discoveryMode: discovery.mode,
          discoveryProvider: discovery.provider,
          blockedReason: discovery.blockedReason ?? null,
          queryCount: discovery.queryCount,
          requireEmail: automation.requireEmail,
          preferBusinessEmail: automation.preferBusinessEmail,
          minimumScore: automation.minimumScore,
        },
        matchStatus: match.status,
        matchReason: match.reason,
        score,
      },
    });
    importedCount += 1;
  }

  const summary = {
    candidateCount: importedCount,
    discoveryMode: discovery.mode,
    discoveryProvider: discovery.provider,
    blockedReason: discovery.blockedReason ?? null,
    queryCount: discovery.queryCount,
    requireEmail: automation.requireEmail,
    preferBusinessEmail: automation.preferBusinessEmail,
    minimumScore: automation.minimumScore,
  };

  const nextRunAt = computeNextAutomationRun(automation, new Date());

  await prisma.prospectSearchJob.update({
    where: { id: job.id },
    data: {
      status: discovery.mode === "blocked" ? "FAILED" : "COMPLETED",
      resultSummaryJson: summary,
    },
  });

  await prisma.prospectAutomation.update({
    where: { id: automation.id },
    data: {
      lastRunAt: new Date(),
      nextRunAt,
      lastResultSummaryJson: summary,
    },
  });

  return {
    automationId: automation.id,
    jobId: job.id,
    candidateCount: importedCount,
    blockedReason: discovery.blockedReason ?? null,
    nextRunAt,
  };
}

export async function runDueProspectAutomations(now = new Date()) {
  const automations = await prisma.prospectAutomation.findMany({
    where: {
      isActive: true,
      OR: [
        { nextRunAt: null },
        { nextRunAt: { lte: now } },
      ],
    },
    orderBy: [{ updatedAt: "asc" }],
    take: 20,
  });

  const results = [] as Array<{ automationId: string; jobId?: string; candidateCount?: number; error?: string | null }>;

  for (const automation of automations) {
    try {
      const result = await runProspectAutomation(automation as AutomationRecord);
      results.push(result);
    } catch (error) {
      results.push({
        automationId: automation.id,
        error: error instanceof Error ? error.message : "Automation run failed.",
      });
    }
  }

  return {
    ranAt: now.toISOString(),
    dueCount: automations.length,
    results,
  };
}
