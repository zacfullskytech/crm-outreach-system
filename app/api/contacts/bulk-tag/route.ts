import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const contactIds = Array.isArray(payload.contactIds) ? payload.contactIds : [];
  const tagId = typeof payload.tagId === "string" ? payload.tagId : null;
  const remove = payload.remove === true;

  if (contactIds.length === 0 || !tagId) {
    return NextResponse.json({ error: "contactIds and tagId are required" }, { status: 400 });
  }

  if (remove) {
    await prisma.contactTag.deleteMany({
      where: {
        contactId: { in: contactIds },
        tagId,
      },
    });

    return NextResponse.json({ data: { removed: contactIds.length } });
  }

  const existing = await prisma.contactTag.findMany({
    where: {
      contactId: { in: contactIds },
      tagId,
    },
  });

  const existingIds = new Set(existing.map((ct) => ct.contactId));
  const toCreate = contactIds.filter((id: string) => !existingIds.has(id));

  if (toCreate.length > 0) {
    await prisma.contactTag.createMany({
      data: toCreate.map((contactId: string) => ({ contactId, tagId })),
    });
  }

  return NextResponse.json({ data: { tagged: toCreate.length, skipped: existing.length } });
}
