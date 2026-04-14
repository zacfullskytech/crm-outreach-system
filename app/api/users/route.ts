import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensurePlatformUser, normalizeEmail } from "@/lib/users";

export async function GET() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: [
      { role: "asc" },
      { createdAt: "asc" },
    ],
  });

  return NextResponse.json({ data: users });
}

export async function POST(request: NextRequest) {
  const { user: sessionUser } = await requireAdmin();

  const payload = await request.json();
  const email = typeof payload.email === "string" ? normalizeEmail(payload.email) : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : null;
  const role = payload.role === "admin" ? "admin" : "member";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  let invited = false;
  let inviteSkippedReason: string | null = null;

  try {
    const adminClient = createAdminClient();
    const metadata = {
      invited_by: sessionUser.email,
      role,
      ...(name ? { name } : {}),
    };

    const lookup = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (lookup.error) {
      throw lookup.error;
    }

    const existingAuthUser = lookup.data.users.find((entry) => entry.email?.toLowerCase() === email);

    if (existingAuthUser) {
      const updateResult = await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
        user_metadata: {
          ...existingAuthUser.user_metadata,
          ...metadata,
        },
      });

      if (updateResult.error) {
        throw updateResult.error;
      }
    } else {
      const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
      const inviteResult = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: metadata,
        redirectTo: `${appBaseUrl}/auth/confirm?next=/&email=${encodeURIComponent(email)}`,
      });

      if (inviteResult.error) {
        const message = inviteResult.error.message || "Failed to invite user.";
        if (message.toLowerCase().includes("rate limit")) {
          inviteSkippedReason = "Invite email rate limit exceeded. The user was added to the platform list, but the invite email was not sent. Try again in a few minutes if they still need an email invite.";
        } else {
          throw inviteResult.error;
        }
      } else {
        invited = true;
      }
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to invite user." }, { status: 500 });
  }

  const user = await ensurePlatformUser(email, name);

  const saved = role === user.role && (name == null || name === user.name)
    ? user
    : await prisma.user.update({
        where: { id: user.id },
        data: { role, name: name ?? user.name },
      });

  return NextResponse.json({ data: saved, invited, inviteSkippedReason });
}
