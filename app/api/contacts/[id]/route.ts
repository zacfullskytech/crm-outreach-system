import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/supabase/auth";
import { normalizeCustomFields } from "@/lib/custom-fields";
import { contactSchema } from "@/lib/validators";
import { normalizeEmail, splitName } from "@/lib/utils";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = contactSchema.partial().parse(payload);
    const name = splitName(parsed.fullName);

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        ...parsed,
        firstName: parsed.fullName !== undefined ? (parsed.firstName || name.firstName) : parsed.firstName,
        lastName: parsed.fullName !== undefined ? (parsed.lastName || name.lastName) : parsed.lastName,
        fullName: parsed.fullName !== undefined ? (parsed.fullName || name.fullName) : parsed.fullName,
        email: parsed.email !== undefined ? normalizeEmail(parsed.email) : undefined,
        customFieldsJson: parsed.customFields ? normalizeCustomFields(parsed.customFields) : undefined,
      },
    });

    return NextResponse.json({ data: contact });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid contact payload" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}
