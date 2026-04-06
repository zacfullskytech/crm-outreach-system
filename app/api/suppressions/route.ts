import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const suppressions = await prisma.suppression.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ data: suppressions });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : null;
  const reason = payload.reason || "MANUAL";

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const existing = await prisma.suppression.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ data: existing });
  }

  const suppression = await prisma.suppression.create({
    data: {
      email,
      reason,
      source: payload.source || "manual",
    },
  });

  await prisma.contact.updateMany({
    where: { email },
    data: { status: reason === "BOUNCE" ? "BOUNCED" : "UNSUBSCRIBED" },
  });

  return NextResponse.json({ data: suppression }, { status: 201 });
}
