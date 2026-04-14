import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";
import { buildSeedCandidates, findProspectMatch, scoreProspectCandidate } from "@/lib/prospecting";
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

    const seededCandidates = buildSeedCandidates({
      industry: parsed.industry,
      geography: parsed.geography,
      includeKeywords: parsed.includeKeywords,
      companyTypes: parsed.companyTypes,
    });

    const job = await prisma.prospectSearchJob.create({
      data: {
        name: parsed.name,
        industry: parsed.industry,
        geographyJson: parsed.geography,
        includeKeywords: parsed.includeKeywords,
        excludeKeywords: parsed.excludeKeywords,
        companyTypesJson: parsed.companyTypes,
        notes: parsed.notes,
        status: "RUNNING",
        createdById: user.id,
      },
    });

    const candidates = [];
    for (const seed of seededCandidates) {
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
            geography: parsed.geography,
            includeKeywords: parsed.includeKeywords,
            excludeKeywords: parsed.excludeKeywords,
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
