import { NextRequest, NextResponse } from "next/server";
import { getGeneralSettings, setGeneralSettings } from "@/lib/settings";

export async function GET() {
  const settings = await getGeneralSettings();
  return NextResponse.json({ data: settings });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();

  const data = {
    defaultFromName: typeof payload.defaultFromName === "string" ? payload.defaultFromName.trim() : "Field Notes CRM",
    defaultFromEmail: typeof payload.defaultFromEmail === "string" ? payload.defaultFromEmail.trim() : "campaigns@example.com",
    defaultReplyTo: typeof payload.defaultReplyTo === "string" ? payload.defaultReplyTo.trim() : "",
    emailProvider: typeof payload.emailProvider === "string" ? payload.emailProvider.trim() : "resend",
    internalTestEmail: typeof payload.internalTestEmail === "string" ? payload.internalTestEmail.trim() : "",
    targetStates: Array.isArray(payload.targetStates)
      ? payload.targetStates
          .map((value: unknown) => String(value).trim().toUpperCase())
          .filter((value: string) => Boolean(value))
      : [],
  };

  const saved = await setGeneralSettings(data);
  return NextResponse.json({ data: saved });
}
