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

  const where = buildWhereFromSegment(segment.filterJson as never);

  const [count, sample] = await Promise.all([
    prisma.contact.count({ where: where as never }),
    prisma.contact.findMany({
      where: where as never,
      include: { company: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({ count, sample });
}
