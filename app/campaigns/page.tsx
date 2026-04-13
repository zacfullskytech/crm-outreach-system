import { requireAuth } from "@/lib/supabase/auth";
import { CampaignsPageClient } from "./page-client";
import { prisma } from "@/lib/db";
import { getGeneralSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const { appUser } = await requireAuth();

  const [campaigns, segments, settings] = await Promise.all([
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
    getGeneralSettings(),
  ]);

  return (
    <CampaignsPageClient
      initialCampaigns={campaigns}
      initialSegments={segments}
      initialDefaults={{
        fromName: settings.defaultFromName,
        fromEmail: settings.defaultFromEmail,
        replyTo: settings.defaultReplyTo,
      }}
      isAdmin={appUser.role === "admin"}
    />
  );
}
