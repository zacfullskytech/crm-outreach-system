import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";
import { buildSeedCandidates, discoverProspectCandidates, findProspectMatch, scoreProspectCandidate } from "@/lib/prospecting";
import { prospectSearchJobSchema } from "@/lib/validators";

export async function GET() {
  await requireAuth();

  const jobs = await prisma.prospectSearchJob.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      _count: { select: { candidates: true, prospects: true } },
    },
    take: 50,
  });

  return NextResponse.json({ data: jobs });
}

export async function POST(request: NextRequest) {
  const { user } = await requireAuth();

  try {
    const payload = await request.json();
    const parsed = prospectSearchJobSchema.parse(payload);

    const rerunSource = parsed.rerunJobId
      ? await prisma.prospectSearchJob.findUnique({ where: { id: parsed.rerunJobId } })
      : null;

    const jobInput = {
      name: parsed.name,
      industry: parsed.industry ?? rerunSource?.industry ?? null,
      geography: parsed.geography.length > 0 ? parsed.geography : Array.isArray(rerunSource?.geographyJson) ? rerunSource.geographyJson.filter((value): value is string => typeof value === "string") : [],
      includeKeywords: parsed.includeKeywords.length > 0 ? parsed.includeKeywords : Array.isArray(rerunSource?.includeKeywords) ? rerunSource.includeKeywords.filter((value): value is string => typeof value === "string") : [],
      excludeKeywords: parsed.excludeKeywords.length > 0 ? parsed.excludeKeywords : Array.isArray(rerunSource?.excludeKeywords) ? rerunSource.excludeKeywords.filter((value): value is string => typeof value === "string") : [],
      companyTypes: parsed.companyTypes.length > 0 ? parsed.companyTypes : Array.isArray(rerunSource?.companyTypesJson) ? rerunSource.companyTypesJson.filter((value): value is string => typeof value === "string") : [],
      notes: parsed.notes ?? rerunSource?.notes ?? null,
      realDataOnly: parsed.realDataOnly ?? rerunSource?.realDataOnly ?? false,
    };

    const discoveredCandidates = await discoverProspectCandidates({
      industry: jobInput.industry,
      geography: jobInput.geography,
      includeKeywords: jobInput.includeKeywords,
      excludeKeywords: jobInput.excludeKeywords,
      companyTypes: jobInput.companyTypes,
    });

    const candidateSeeds = discoveredCandidates.length > 0 || jobInput.realDataOnly
      ? discoveredCandidates
      : buildSeedCandidates({
          industry: jobInput.industry,
          geography: jobInput.geography,
          includeKeywords: jobInput.includeKeywords,
          companyTypes: jobInput.companyTypes,
        });

    const discoveryMode = discoveredCandidates.length > 0 ? "web" : jobInput.realDataOnly ? "empty" : "seed";

    const job = await prisma.prospectSearchJob.create({
      data: {
        name: jobInput.name,
        industry: jobInput.industry,
        geographyJson: jobInput.geography,
        includeKeywords: jobInput.includeKeywords,
        excludeKeywords: jobInput.excludeKeywords,
        companyTypesJson: jobInput.companyTypes,
        notes: jobInput.notes,
        realDataOnly: jobInput.realDataOnly,
        lastRunAt: new Date(),
        lastDiscoveryMode: discoveryMode,
        status: "RUNNING",
        createdById: user.id,
      },
    });

    const candidates = [];
    for (const seed of candidateSeeds) {
      const match = await findProspectMatch(seed);
      const score = scoreProspectCandidate(seed);
      const candidate = await prisma.prospectCandidate.create({
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
            geography: jobInput.geography,
            includeKeywords: jobInput.includeKeywords,
            excludeKeywords: jobInput.excludeKeywords,
            realDataOnly: jobInput.realDataOnly,
            discoveryMode,
            rerunJobId: parsed.rerunJobId ?? null,
          },
          matchStatus: match.status,
          matchReason: match.reason,
          score,
        },
      });
      candidates.push(candidate);
    }

    const completed = await prisma.prospectSearchJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        resultSummaryJson: {
          candidateCount: candidates.length,
          newCount: candidates.filter((candidate) => candidate.matchStatus === "NEW").length,
          reviewCount: candidates.filter((candidate) => candidate.matchStatus !== "NEW").length,
          discoveryMode,
          realDataOnly: jobInput.realDataOnly,
        },
      },
      include: {
        candidates: {
          orderBy: [{ score: "desc" }, { createdAt: "desc" }],
        },
        _count: { select: { candidates: true, prospects: true } },
      },
    });

    return NextResponse.json({ data: completed }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid prospecting job payload." }, { status: 400 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create prospecting job." }, { status: 500 });
  }
}
