import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";

export async function DELETE(request: NextRequest) {
  await requireAuth();

  try {
    const payload = (await request.json().catch(() => ({}))) as { ids?: unknown };
    const rawIds = Array.isArray(payload.ids) ? payload.ids : [];
    const ids = rawIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0);

    if (ids.length === 0) {
      return NextResponse.json({ error: "ids are required" }, { status: 400 });
    }

    await prisma.prospect.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ ok: true, deletedCount: ids.length });
  } catch {
    return NextResponse.json({ error: "Failed to bulk delete prospects" }, { status: 500 });
  }
}
