import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildWhereFromSegment } from "@/lib/filters";
import { segmentGroupSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const entityType = payload.entityType === "company" || payload.entityType === "prospect" ? payload.entityType : "contact";
  const filterJson = segmentGroupSchema.parse(payload.filterJson);
  const where = buildWhereFromSegment(filterJson);

  if (entityType === "company") {
    const [count, sample] = await Promise.all([
      prisma.company.count({ where: where as never }),
      prisma.company.findMany({
        where: where as never,
        include: { contacts: { select: { id: true, fullName: true, email: true } } },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ count, sample });
  }

  if (entityType === "prospect") {
    const [count, sample] = await Promise.all([
      prisma.prospect.count({ where: where as never }),
      prisma.prospect.findMany({
        where: where as never,
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ count, sample });
  }

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
