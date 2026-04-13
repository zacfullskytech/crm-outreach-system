import { requireAuth } from "@/lib/supabase/auth";
import { CampaignsPageClient } from "./page-client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const { appUser } = await requireAuth();

  const [campaigns, segments] = await Promise.all([
    prisma.campaign.findMany({
      include: { recipients: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.segment.findMany({
      select: { id: true, name: true, entityType: true },
      where: { entityType: "contact" },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return <CampaignsPageClient initialCampaigns={campaigns} initialSegments={segments} isAdmin={appUser.role === "admin"} />;
}
