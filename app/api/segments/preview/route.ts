import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildWhereFromSegment } from "@/lib/filters";
import { segmentGroupSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const filterJson = segmentGroupSchema.parse(payload.filterJson);
  const where = buildWhereFromSegment(filterJson);

  const [count, sample] = await Promise.all([
    prisma.contact.count({ where: where as never }),
    prisma.contact.findMany({
      where: where as never,
      include: { company: true },
      take: 10,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ count, sample });
}
