import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { contactSchema } from "@/lib/validators";
import { normalizeEmail, splitName } from "@/lib/utils";

export async function GET() {
  const contacts = await prisma.contact.findMany({
    include: { company: true, tags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: contacts });
}

export async function POST(request: NextRequest) {
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
      },
    });

    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid contact payload" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
