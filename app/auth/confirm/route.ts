import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const publicBaseUrl = process.env.APP_BASE_URL || requestUrl.origin;
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const email = requestUrl.searchParams.get("email") || "";
  const next = requestUrl.searchParams.get("next") || "/";
  const loginUrl = new URL("/login", publicBaseUrl);

  if (!tokenHash || !type) {
    loginUrl.searchParams.set("error", "Invite link is missing required auth parameters.");
    if (email) loginUrl.searchParams.set("email", email);
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as "invite" | "recovery" | "email_change" | "email",
  });

  if (error) {
    loginUrl.searchParams.set("error", error.message || "Invite link could not be verified.");
    if (email) loginUrl.searchParams.set("email", email);
    return NextResponse.redirect(loginUrl);
  }

  if (type === "recovery") {
    loginUrl.searchParams.set("recovery", "1");
  } else {
    loginUrl.searchParams.set("invited", "1");
  }

  if (email) {
    loginUrl.searchParams.set("email", email);
  }

  loginUrl.searchParams.set("next", next);
  return NextResponse.redirect(loginUrl);
}
