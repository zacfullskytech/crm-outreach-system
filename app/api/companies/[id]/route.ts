import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/supabase/auth";
import { normalizeCustomFields } from "@/lib/custom-fields";
import { companySchema } from "@/lib/validators";
import { normalizeWebsite } from "@/lib/utils";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = companySchema.partial({ name: true }).parse(payload);
    const { services: _services, customFields, ...companyFields } = parsed;

    const company = await prisma.company.update({
      where: { id },
      data: {
        ...companyFields,
        state: parsed.state?.toUpperCase() || null,
        emailDomain: parsed.website !== undefined ? normalizeWebsite(parsed.website) : undefined,
        customFieldsJson: customFields ? normalizeCustomFields(customFields) : undefined,
      },
    });

    return NextResponse.json({ data: company });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid company payload" }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update company" },
      { status: 500 },
    );
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete company" }, { status: 500 });
  }
}
