import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { runDueScheduledCampaigns } from "@/lib/campaigns";

function hasValidSchedulerToken(request: NextRequest) {
  const configuredToken = process.env.SCHEDULER_SECRET?.trim();
  if (!configuredToken) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  return authHeader.slice("Bearer ".length).trim() === configuredToken;
}

export async function POST(request: NextRequest) {
  const authorizedByToken = hasValidSchedulerToken(request);

  if (!authorizedByToken) {
    await requireAdmin();
  }

  try {
    const data = await runDueScheduledCampaigns(new Date());
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run due campaigns";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
