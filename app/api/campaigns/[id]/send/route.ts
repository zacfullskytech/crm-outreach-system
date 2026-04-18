import { NextRequest, NextResponse } from "next/server";
import { runCampaignNow } from "@/lib/campaigns";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const data = await runCampaignNow(id);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send campaign";
    const status = message === "Campaign not found" || message === "Linked segment not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
