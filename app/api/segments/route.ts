import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { segmentSchema } from "@/lib/validators";

export async function GET() {
  const segments = await prisma.segment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: segments });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const parsed = segmentSchema.parse(payload);

  const segment = await prisma.segment.create({
    data: parsed,
  });

  return NextResponse.json({ data: segment }, { status: 201 });
}
