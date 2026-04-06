import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    take: 200,
  });

  return NextResponse.json({ data: tags });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const name = typeof payload.name === "string" ? payload.name.trim() : null;
  const color = typeof payload.color === "string" ? payload.color.trim() : null;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const existing = await prisma.tag.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ data: existing });
  }

  const tag = await prisma.tag.create({
    data: { name, color },
  });

  return NextResponse.json({ data: tag }, { status: 201 });
}
