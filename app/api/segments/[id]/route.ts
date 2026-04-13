import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/supabase/auth";
import { segmentSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = segmentSchema.parse(payload);

    const segment = await prisma.segment.update({
      where: { id },
      data: {
        name: parsed.name,
        description: parsed.description ?? null,
        entityType: parsed.entityType,
        filterJson: parsed.filterJson,
      },
    });

    return NextResponse.json({ data: segment });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid segment payload" }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update segment" },
      { status: 500 },
    );
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    await prisma.segment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete segment" }, { status: 500 });
  }
}
