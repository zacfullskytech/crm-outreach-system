import { NextRequest, NextResponse } from "next/server";
import { deliverCampaignRecipients } from "@/lib/campaigns";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const data = await deliverCampaignRecipients(id);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to dispatch campaign";
    const status = message === "Campaign not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
