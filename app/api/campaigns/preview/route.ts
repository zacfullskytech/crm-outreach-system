import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildWhereFromSegment } from "@/lib/filters";

export async function GET(request: NextRequest) {
  const segmentId = request.nextUrl.searchParams.get("segmentId");
  if (!segmentId) {
    return NextResponse.json({ error: "segmentId is required" }, { status: 400 });
  }

  const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
  if (!segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }

  if (segment.entityType !== "contact") {
    return NextResponse.json(
      { error: `Campaign preview only supports contact segments right now. Selected segment type: ${segment.entityType}.` },
      { status: 400 },
    );
  }

  const where = buildWhereFromSegment(segment.filterJson as never);

  const baseContacts = await prisma.contact.findMany({
    where: where as never,
    include: { company: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const suppressedEmails = new Set(
    (await prisma.suppression.findMany({ select: { email: true } })).map((entry) => entry.email),
  );

  const eligible = baseContacts.filter((contact) =>
    Boolean(contact.email) &&
    !suppressedEmails.has(contact.email!) &&
    !["UNSUBSCRIBED", "BOUNCED", "INVALID", "DO_NOT_CONTACT"].includes(contact.status),
  );

  return NextResponse.json({
    count: baseContacts.length,
    eligibleCount: eligible.length,
    sample: eligible.slice(0, 10),
  });
}
