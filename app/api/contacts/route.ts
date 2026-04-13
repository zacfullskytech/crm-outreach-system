import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/supabase/auth";
import { normalizeCustomFields } from "@/lib/custom-fields";
import { contactSchema } from "@/lib/validators";
import { normalizeEmail, splitName } from "@/lib/utils";

export async function GET() {
  await requireAuth();
  const contacts = await prisma.contact.findMany({
    include: { company: true, tags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: contacts });
}

export async function POST(request: NextRequest) {
  await requireAuth();

  try {
    const payload = await request.json();
    const parsed = contactSchema.parse(payload);
    const name = splitName(parsed.fullName);

    const contact = await prisma.contact.create({
      data: {
        ...parsed,
        firstName: parsed.firstName || name.firstName,
        lastName: parsed.lastName || name.lastName,
        fullName: parsed.fullName || name.fullName,
        email: normalizeEmail(parsed.email),
        customFieldsJson: normalizeCustomFields(parsed.customFields),
      },
    });

    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid contact payload" }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create contact" },
      { status: 500 },
    );
  }
}
