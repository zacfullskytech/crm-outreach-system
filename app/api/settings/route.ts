import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { getGeneralSettings, setGeneralSettings } from "@/lib/settings";

export async function GET() {
  await requireAdmin();
  const settings = await getGeneralSettings();
  return NextResponse.json({ data: settings });
}

export async function POST(request: NextRequest) {
  await requireAdmin();

  const payload = await request.json();

  const senderProfiles = Array.isArray(payload.senderProfiles)
    ? payload.senderProfiles
        .map((entry: unknown, index: number) => {
          if (!entry || typeof entry !== "object") return null;
          const value = entry as Record<string, unknown>;
          const fromEmail = typeof value.fromEmail === "string" ? value.fromEmail.trim() : "";
          if (!fromEmail) return null;
          return {
            id: typeof value.id === "string" && value.id.trim() ? value.id.trim() : `sender-${index + 1}`,
            label: typeof value.label === "string" && value.label.trim() ? value.label.trim() : fromEmail,
            fromName: typeof value.fromName === "string" ? value.fromName.trim() : "",
            fromEmail,
            replyTo: typeof value.replyTo === "string" ? value.replyTo.trim() : "",
          };
        })
        .filter((entry: { id: string; label: string; fromName: string; fromEmail: string; replyTo: string } | null): entry is { id: string; label: string; fromName: string; fromEmail: string; replyTo: string } => Boolean(entry))
    : [];

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
    senderProfiles,
  };

  const saved = await setGeneralSettings(data);
  return NextResponse.json({ data: saved });
}
