import { NextRequest, NextResponse } from "next/server";
import { runDueProspectAutomations } from "@/lib/prospect-automations";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const schedulerSecret = process.env.SCHEDULER_SECRET || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!schedulerSecret || bearerToken !== schedulerSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await runDueProspectAutomations(new Date());
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to run prospect automations." }, { status: 500 });
  }
}
