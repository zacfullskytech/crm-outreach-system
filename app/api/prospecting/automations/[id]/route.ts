import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/supabase/auth";
import { prospectAutomationSchema } from "@/lib/validators";
import { computeNextAutomationRun, runProspectAutomation } from "@/lib/prospect-automations";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = prospectAutomationSchema.partial({ name: true, geography: true }).parse(payload);
    const existing = await prisma.prospectAutomation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Automation not found." }, { status: 404 });
    }

    const merged = {
      scheduleType: parsed.scheduleType ?? existing.scheduleType,
      scheduleHourLocal: parsed.scheduleHourLocal ?? existing.scheduleHourLocal,
      scheduleMinuteLocal: parsed.scheduleMinuteLocal ?? existing.scheduleMinuteLocal,
      isActive: parsed.isActive ?? existing.isActive,
    };

    const automation = await prisma.prospectAutomation.update({
      where: { id },
      data: {
        name: parsed.name,
        industry: parsed.industry,
        geographyJson: parsed.geography,
        includeKeywordsJson: parsed.includeKeywords,
        excludeKeywordsJson: parsed.excludeKeywords,
        companyTypesJson: parsed.companyTypes,
        notes: parsed.notes,
        realDataOnly: parsed.realDataOnly,
        requireEmail: parsed.requireEmail,
        preferBusinessEmail: parsed.preferBusinessEmail,
        minimumScore: parsed.minimumScore,
        maxResultsPerRun: parsed.maxResultsPerRun,
        scheduleType: parsed.scheduleType,
        scheduleHourLocal: parsed.scheduleHourLocal,
        scheduleMinuteLocal: parsed.scheduleMinuteLocal,
        timezone: parsed.timezone,
        isActive: parsed.isActive,
        nextRunAt: merged.isActive ? computeNextAutomationRun(merged, new Date()) : null,
      },
    });

    return NextResponse.json({ data: automation });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid automation payload." }, { status: 400 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update automation." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    await prisma.prospectAutomation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete automation." }, { status: 500 });
  }
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    const automation = await prisma.prospectAutomation.findUnique({ where: { id } });
    if (!automation) {
      return NextResponse.json({ error: "Automation not found." }, { status: 404 });
    }

    const data = await runProspectAutomation(automation);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to run automation." }, { status: 500 });
  }
}
