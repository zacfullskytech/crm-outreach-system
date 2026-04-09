import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/supabase/auth";
import { companySchema } from "@/lib/validators";
import { normalizeWebsite } from "@/lib/utils";

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

    const company = await prisma.company.create({
      data: {
        ...parsed,
        state: parsed.state?.toUpperCase() || null,
        emailDomain: normalizeWebsite(parsed.website),
      },
    });

    return NextResponse.json({ data: company }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid company payload" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}
