import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { generateMarketingAsset } from "@/lib/openai";
import { normalizeCustomFields } from "@/lib/custom-fields";

export async function POST(request: NextRequest) {
  await requireAuth();

  try {
    const payload = await request.json();
    const result = await generateMarketingAsset({
      title: typeof payload.title === "string" ? payload.title : "Untitled marketing asset",
      contentType: typeof payload.contentType === "string" ? payload.contentType : "Flier",
      audience: typeof payload.audience === "string" ? payload.audience : null,
      serviceLine: typeof payload.serviceLine === "string" ? payload.serviceLine : null,
      channel: typeof payload.channel === "string" ? payload.channel : null,
      description: typeof payload.description === "string" ? payload.description : null,
      promptNotes: typeof payload.promptNotes === "string" ? payload.promptNotes : null,
      variables: normalizeCustomFields(payload.variables),
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate content." }, { status: 500 });
  }
}
