import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { upsertCompanyFromProspect } from "@/lib/prospect-companies";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prospect = await prisma.prospect.findUnique({ where: { id } });

  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  const { company, contact } = await upsertCompanyFromProspect(prospect);

  await prisma.prospect.update({
    where: { id: prospect.id },
    data: { qualificationStatus: "CONVERTED" },
  });

  return NextResponse.json({ data: { company, contact } });
}
