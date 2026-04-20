import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { downloadMarketingAsset } from "@/lib/file-storage";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ blobName: string[] }> }) {
  try {
    const { blobName } = await params;
    const joined = Array.isArray(blobName) ? blobName.join("/") : "";
    if (!joined) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    const asset = await downloadMarketingAsset(joined);
    if (!asset.stream) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    const webStream = Readable.toWeb(asset.stream as import("stream").Readable);

    return new NextResponse(webStream as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": asset.cacheControl,
        ...(asset.etag ? { ETag: asset.etag } : {}),
        ...(asset.lastModified ? { "Last-Modified": asset.lastModified.toUTCString() } : {}),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load asset." }, { status: 500 });
  }
}
