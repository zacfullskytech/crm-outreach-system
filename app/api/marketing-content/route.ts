import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/supabase/auth";
import { marketingContentSchema } from "@/lib/validators";
import { normalizeCustomFields } from "@/lib/custom-fields";

export async function GET(request: NextRequest) {
  await requireAuth();

  const search = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
  const contentType = request.nextUrl.searchParams.get("contentType")?.trim() || "";
  const serviceLine = request.nextUrl.searchParams.get("serviceLine")?.trim() || "";
  const audience = request.nextUrl.searchParams.get("audience")?.trim() || "";

  const items = await prisma.marketingContent.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const filtered = items.filter((item) => {
    const haystack = [
      item.title,
      item.description || "",
      item.serviceLine || "",
      item.audience || "",
      item.channel || "",
      item.contentType,
      item.bodyText || "",
      ...(Array.isArray(item.tagsJson) ? item.tagsJson.map((value) => String(value)) : []),
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search || haystack.includes(search)) &&
      (!contentType || item.contentType === contentType) &&
      (!serviceLine || item.serviceLine === serviceLine) &&
      (!audience || item.audience === audience)
    );
  });

  return NextResponse.json({ data: filtered });
}

export async function POST(request: NextRequest) {
  const { appUser } = await requireAuth();

  try {
    const payload = await request.json();
    const parsed = marketingContentSchema.parse(payload);

    const item = await prisma.marketingContent.create({
      data: {
        title: parsed.title,
        description: parsed.description ?? null,
        contentType: parsed.contentType,
        serviceLine: parsed.serviceLine ?? null,
        audience: parsed.audience ?? null,
        channel: parsed.channel ?? null,
        fileName: parsed.fileName ?? null,
        fileUrl: parsed.fileUrl ?? null,
        bodyText: parsed.bodyText ?? null,
        bodyHtml: parsed.bodyHtml ?? null,
        promptNotes: parsed.promptNotes ?? null,
        tagsJson: parsed.tags ?? [],
        variablesJson: normalizeCustomFields(parsed.variables),
        createdById: appUser.id,
      },
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid marketing content payload" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create marketing content" }, { status: 500 });
  }
}
