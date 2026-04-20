import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { uploadMarketingAsset } from "@/lib/file-storage";

export async function POST(request: NextRequest) {
  await requireAuth();

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = typeof formData.get("folder") === "string" ? String(formData.get("folder")) : "library/marketing";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uploaded = await uploadMarketingAsset({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      buffer: Buffer.from(arrayBuffer),
      folder,
    });

    return NextResponse.json({
      data: {
        fileName: uploaded.fileName,
        fileUrl: uploaded.appUrl,
        blobUrl: uploaded.blobUrl,
        blobName: uploaded.blobName,
        contentType: file.type || "application/octet-stream",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to upload marketing asset." }, { status: 500 });
  }
}
