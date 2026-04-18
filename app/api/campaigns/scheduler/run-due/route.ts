import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { runDueScheduledCampaigns } from "@/lib/campaigns";

function getSchedulerAuthState(request: NextRequest) {
  const configuredToken = process.env.SCHEDULER_SECRET?.trim() || "";
  const authHeader = request.headers.get("authorization") || "";

  if (!configuredToken) {
    return {
      authorizedByToken: false,
      reason: "SCHEDULER_SECRET is not configured",
    } as const;
  }

  if (!authHeader.startsWith("Bearer ")) {
    return {
      authorizedByToken: false,
      reason: "Authorization header missing Bearer token",
    } as const;
  }

  const providedToken = authHeader.slice("Bearer ".length).trim();
  if (providedToken !== configuredToken) {
    return {
      authorizedByToken: false,
      reason: "Bearer token does not match SCHEDULER_SECRET",
    } as const;
  }

  return {
    authorizedByToken: true,
    reason: null,
  } as const;
}

export async function POST(request: NextRequest) {
  const auth = getSchedulerAuthState(request);

  if (!auth.authorizedByToken) {
    try {
      await requireAdmin();
    } catch {
      return NextResponse.json(
        {
          error: "Unauthorized scheduler run request",
          diagnostics: {
            authorizedByToken: false,
            reason: auth.reason,
            schedulerSecretConfigured: Boolean(process.env.SCHEDULER_SECRET?.trim()),
          },
        },
        { status: 401 },
      );
    }
  }

  try {
    const data = await runDueScheduledCampaigns(new Date());
    return NextResponse.json({
      data,
      diagnostics: {
        authorizedByToken: auth.authorizedByToken,
        authReason: auth.reason,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run due campaigns";
    return NextResponse.json(
      {
        error: message,
        diagnostics: {
          authorizedByToken: auth.authorizedByToken,
          authReason: auth.reason,
          schedulerSecretConfigured: Boolean(process.env.SCHEDULER_SECRET?.trim()),
          emailProvider: process.env.EMAIL_PROVIDER || "resend",
          resendConfigured: Boolean(process.env.RESEND_API_KEY),
          mailgunConfigured: Boolean(process.env.MAILGUN_API_KEY) && Boolean(process.env.MAILGUN_DOMAIN),
          appBaseUrl: process.env.APP_BASE_URL || null,
        },
      },
      { status: 500 },
    );
  }
}
