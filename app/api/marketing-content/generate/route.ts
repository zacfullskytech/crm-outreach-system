import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { generateMarketingAsset, generateMarketingImage } from "@/lib/openai";
import { getMarketingImageSignedUrl, saveGeneratedMarketingImage } from "@/lib/file-storage";
import { normalizeCustomFields } from "@/lib/custom-fields";
import { prisma } from "@/lib/db";
import { describeSegmentIntent } from "@/lib/segment-intent";

export async function POST(request: NextRequest) {
  await requireAuth();

  try {
    const payload = await request.json();
    const segment = typeof payload.segmentId === "string" && payload.segmentId
      ? await prisma.segment.findUnique({ where: { id: payload.segmentId } })
      : null;
    const segmentIntent = segment ? describeSegmentIntent(segment) : null;

    const result = await generateMarketingAsset({
      title: typeof payload.title === "string" ? payload.title : "Untitled marketing asset",
      contentType: typeof payload.contentType === "string" ? payload.contentType : "Flier",
      audience: typeof payload.audience === "string" ? payload.audience : segmentIntent?.audience ?? null,
      serviceLine: typeof payload.serviceLine === "string" ? payload.serviceLine : segmentIntent?.serviceLine ?? null,
      channel: typeof payload.channel === "string" ? payload.channel : null,
      industry: typeof payload.industry === "string" ? payload.industry : segmentIntent?.industry ?? null,
      offerType: typeof payload.offerType === "string" ? payload.offerType : segmentIntent?.offerType ?? null,
      assetFormat: typeof payload.assetFormat === "string" ? payload.assetFormat : null,
      tone: typeof payload.tone === "string" ? payload.tone : null,
      lifecycleStage: typeof payload.lifecycleStage === "string" ? payload.lifecycleStage : segmentIntent?.lifecycleStage ?? null,
      description: typeof payload.description === "string" ? payload.description : segmentIntent?.description ?? null,
      promptNotes: typeof payload.promptNotes === "string" ? payload.promptNotes : segmentIntent?.promptNotes ?? null,
      promptTemplateKey: typeof payload.promptTemplateKey === "string" ? payload.promptTemplateKey : null,
      variables: normalizeCustomFields(payload.variables),
    });

    const imageUrl = payload.generateImage === true && result.imagePrompt
      ? await (async () => {
          const imagePrompt = result.imagePrompt as string;
          const saved = await saveGeneratedMarketingImage({
            title: typeof payload.title === "string" ? payload.title : "marketing-asset",
            base64: await generateMarketingImage(imagePrompt),
          });
          return getMarketingImageSignedUrl(saved.blobName);
        })()
      : null;

    return NextResponse.json({ data: { ...result, imageUrl } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate content." }, { status: 500 });
  }
}
