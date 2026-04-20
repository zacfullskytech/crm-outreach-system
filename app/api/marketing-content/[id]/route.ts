import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/supabase/auth";
import { marketingContentSchema } from "@/lib/validators";
import { normalizeCustomFields } from "@/lib/custom-fields";
import { getBlobNameFromUrl, getMarketingAssetAppUrl } from "@/lib/file-storage";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = marketingContentSchema.partial({ title: true }).parse(payload);

    const fileBlobName = parsed.fileUrl ? getBlobNameFromUrl(parsed.fileUrl) : null;
    const imageBlobName = parsed.imageUrl ? getBlobNameFromUrl(parsed.imageUrl) : null;

    const item = await prisma.marketingContent.update({
      where: { id },
      data: {
        title: parsed.title,
        description: parsed.description,
        contentType: parsed.contentType,
        serviceLine: parsed.serviceLine,
        audience: parsed.audience,
        channel: parsed.channel,
        industry: parsed.industry,
        offerType: parsed.offerType,
        assetFormat: parsed.assetFormat,
        tone: parsed.tone,
        lifecycleStage: parsed.lifecycleStage,
        fileName: parsed.fileName,
        fileUrl: parsed.fileUrl === undefined ? undefined : fileBlobName ? getMarketingAssetAppUrl(fileBlobName) : parsed.fileUrl,
        imagePrompt: parsed.imagePrompt,
        imageUrl: parsed.imageUrl === undefined ? undefined : imageBlobName ? getMarketingAssetAppUrl(imageBlobName) : parsed.imageUrl,
        callToAction: parsed.callToAction,
        bodyText: parsed.bodyText,
        bodyHtml: parsed.bodyHtml,
        promptNotes: parsed.promptNotes,
        promptTemplateKey: parsed.promptTemplateKey,
        tagsJson: parsed.tags,
        taxonomyJson: parsed.taxonomy,
        variablesJson: parsed.variables ? normalizeCustomFields(parsed.variables) : undefined,
      },
    });

    return NextResponse.json({ data: item });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid marketing content payload" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to update marketing content" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    await prisma.marketingContent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete marketing content" }, { status: 500 });
  }
}
