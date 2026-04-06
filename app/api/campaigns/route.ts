import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { campaignSchema } from "@/lib/validators";

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    include: { recipients: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: campaigns });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = campaignSchema.parse(payload);

    const campaign = await prisma.campaign.create({
      data: {
        ...parsed,
        scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : null,
      },
    });

    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid campaign payload" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
