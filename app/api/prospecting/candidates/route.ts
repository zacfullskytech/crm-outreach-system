import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";

export async function DELETE(request: NextRequest) {
  await requireAuth();

  try {
    const jobId = request.nextUrl.searchParams.get("jobId");
    const onlyReviewed = request.nextUrl.searchParams.get("onlyReviewed") === "true";

    await prisma.prospectCandidate.deleteMany({
      where: {
        ...(jobId ? { searchJobId: jobId } : {}),
        ...(onlyReviewed ? { status: { not: "NEW" } } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to clear discovery queue." }, { status: 500 });
  }
}
