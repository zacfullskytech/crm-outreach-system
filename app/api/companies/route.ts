import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/supabase/auth";
import { normalizeCustomFields } from "@/lib/custom-fields";
import { companySchema } from "@/lib/validators";
import { normalizeEmail, normalizeWebsite } from "@/lib/utils";

export async function GET() {
  await requireAuth();
  const companies = await prisma.company.findMany({
    include: { contacts: true, tags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: companies });
}

export async function POST(request: NextRequest) {
  await requireAuth();

  try {
    const payload = await request.json();
    const parsed = companySchema.parse(payload);
    const { services: _services, customFields } = parsed;

    const company = await prisma.company.create({
      data: {
        name: parsed.name,
        businessType: parsed.businessType ?? null,
        industry: parsed.industry ?? null,
        website: parsed.website ?? null,
        phone: parsed.phone ?? null,
        email: normalizeEmail(parsed.email),
        city: parsed.city ?? null,
        state: parsed.state?.toUpperCase() || null,
        postalCode: parsed.postalCode ?? null,
        source: parsed.source ?? null,
        notes: parsed.notes ?? null,
        status: parsed.status ?? "LEAD",
        emailDomain: normalizeWebsite(parsed.website),
        customFieldsJson: normalizeCustomFields(customFields),
      },
    });

    return NextResponse.json({ data: company }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid company payload" }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create company" },
      { status: 500 },
    );
  }
}
