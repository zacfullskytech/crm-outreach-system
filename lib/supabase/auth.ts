import { createClient } from "@/lib/supabase/server";
import { ensurePlatformUser } from "@/lib/users";
import { redirect } from "next/navigation";

type AppUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const appUser = await ensurePlatformUser(user.email, user.user_metadata?.full_name ?? user.user_metadata?.name ?? null);

  return { user, appUser };
}

export async function requireAdmin() {
  const session = await requireAuth();

  if (session.appUser.role !== "admin") {
    redirect("/");
  }

  return session;
}

export async function getCurrentAppUser() {
  const session = await requireAuth();
  return session.appUser;
}
