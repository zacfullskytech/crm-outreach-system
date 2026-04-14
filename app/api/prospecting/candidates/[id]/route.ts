import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";
import { findProspectMatch, scoreProspectCandidate } from "@/lib/prospecting";
import { prospectCandidateReviewSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  try {
    const payload = await request.json();
    const parsed = prospectCandidateReviewSchema.parse(payload);

    const candidate = await prisma.prospectCandidate.findUnique({ where: { id } });
    if (!candidate) {
      return NextResponse.json({ error: "Prospect candidate not found." }, { status: 404 });
    }

    const updated = await prisma.prospectCandidate.update({
      where: { id },
      data: {
        status: parsed.status,
        notes: parsed.notes ?? candidate.notes,
      },
    });

    if (parsed.status === "APPROVED") {
      const match = await findProspectMatch(updated);
      const score = scoreProspectCandidate(updated);
      const prospect = await prisma.prospect.create({
        data: {
          companyName: updated.companyName,
          contactName: updated.contactName,
          email: updated.email,
          phone: updated.phone,
          website: updated.website,
          industry: updated.industry,
          businessType: updated.businessType,
          city: updated.city,
          state: updated.state,
          postalCode: updated.postalCode,
          source: updated.source,
          sourceUrl: updated.sourceUrl,
          notes: updated.notes,
          matchStatus: match.status,
          matchReason: match.reason,
          score,
          searchJobId: updated.searchJobId,
          candidateId: updated.id,
          qualificationStatus: match.status === "NEW" ? "NEW" : "REVIEWING",
        },
      });

      await prisma.prospectCandidate.update({
        where: { id },
        data: {
          status: "IMPORTED",
          matchStatus: match.status,
          matchReason: match.reason,
          score,
        },
      });

      return NextResponse.json({ data: { candidate: updated, prospect } });
    }

    return NextResponse.json({ data: { candidate: updated } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid candidate review payload." }, { status: 400 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update prospect candidate." }, { status: 500 });
  }
}
