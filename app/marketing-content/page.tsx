import { requireAuth } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";
import { MarketingContentManager } from "@/components/marketing-content-manager";

export const dynamic = "force-dynamic";

export default async function MarketingContentPage() {
  const { appUser } = await requireAuth();

  const items = await prisma.marketingContent.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return <MarketingContentManager initialItems={items} isAdmin={appUser.role === "admin"} />;
}
