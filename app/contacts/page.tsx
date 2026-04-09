import { ContactManager } from "@/components/contact-manager";
import { prisma } from "@/lib/db";

import { requireAuth } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const { appUser } = await requireAuth();

  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({
      include: { company: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  return <ContactManager initialContacts={contacts} initialCompanies={companies} isAdmin={appUser.role === "admin"} />;
}
