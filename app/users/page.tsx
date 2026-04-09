import { AppShell } from "@/components/app-shell";
import { UserManagement } from "@/components/user-management";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const { appUser } = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  return (
    <AppShell isAdmin>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Users</span>
          <h2>Control who can access the platform and who can administer it.</h2>
          <p>
            Invite teammates into the internal user list, promote trusted admins, and remove access while preserving the
            primary administrator account.
          </p>
        </section>

        <section className="card">
          <h3>User Management</h3>
          <UserManagement initialUsers={users} currentUserId={appUser.id} />
        </section>
      </div>
    </AppShell>
  );
}
