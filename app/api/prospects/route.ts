import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/supabase/auth";
import { scoreProspect } from "@/lib/prospects";
import { prospectSchema } from "@/lib/validators";

export async function GET() {
  await requireAuth();
  const prospects = await prisma.prospect.findMany({
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({ data: prospects });
}

export async function POST(request: NextRequest) {
  await requireAuth();

  try {
    const payload = await request.json();
    const parsed = prospectSchema.parse(payload);
    const score =
      parsed.score ??
      scoreProspect({
        industry: parsed.industry,
        state: parsed.state,
        city: parsed.city,
        website: parsed.website,
        email: parsed.email,
        contactName: parsed.contactName,
        businessType: parsed.businessType,
      });

    const prospect = await prisma.prospect.create({
      data: {
        ...parsed,
        state: parsed.state?.toUpperCase() || null,
        score,
      },
    });

    return NextResponse.json({ data: prospect }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid prospect payload" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create prospect" }, { status: 500 });
  }
}
