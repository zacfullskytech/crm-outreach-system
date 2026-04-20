import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/supabase/auth";
import { prospectAutomationSchema } from "@/lib/validators";
import { computeNextAutomationRun } from "@/lib/prospect-automations";

export async function GET() {
  await requireAuth();

  const automations = await prisma.prospectAutomation.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 50,
  });

  return NextResponse.json({ data: automations });
}

export async function POST(request: NextRequest) {
  const { user } = await requireAuth();

  try {
    const payload = await request.json();
    const parsed = prospectAutomationSchema.parse(payload);
    const nextRunAt = parsed.isActive ? computeNextAutomationRun(parsed, new Date()) : null;

    const automation = await prisma.prospectAutomation.create({
      data: {
        name: parsed.name,
        industry: parsed.industry ?? null,
        geographyJson: parsed.geography,
        includeKeywordsJson: parsed.includeKeywords,
        excludeKeywordsJson: parsed.excludeKeywords,
        companyTypesJson: parsed.companyTypes,
        notes: parsed.notes ?? null,
        realDataOnly: parsed.realDataOnly,
        requireEmail: parsed.requireEmail,
        preferBusinessEmail: parsed.preferBusinessEmail,
        minimumScore: parsed.minimumScore ?? null,
        maxResultsPerRun: parsed.maxResultsPerRun,
        scheduleType: parsed.scheduleType,
        scheduleHourLocal: parsed.scheduleHourLocal,
        scheduleMinuteLocal: parsed.scheduleMinuteLocal,
        timezone: parsed.timezone,
        isActive: parsed.isActive,
        nextRunAt,
        createdById: user.id,
      },
    });

    return NextResponse.json({ data: automation }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid automation payload." }, { status: 400 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create automation." }, { status: 500 });
  }
}
