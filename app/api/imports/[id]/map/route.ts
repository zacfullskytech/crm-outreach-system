import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await request.json();

  const job = await prisma.importJob.update({
    where: { id },
    data: {
      mappingJson: payload,
      status: "MAPPED",
    },
  });

  return NextResponse.json({ data: job });
}
