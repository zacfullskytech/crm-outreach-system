import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
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
  try {
    const payload = await request.json();
    const parsed = segmentSchema.parse(payload);

    const segment = await prisma.segment.create({
      data: parsed,
    });

    return NextResponse.json({ data: segment }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid segment payload" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create segment" }, { status: 500 });
  }
}
