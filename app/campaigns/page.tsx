import { requireAuth } from "@/lib/supabase/auth";
import { CampaignsPageClient } from "./page-client";
import { prisma } from "@/lib/db";
import { getGeneralSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const { appUser } = await requireAuth();

  const [campaigns, segments, settings, marketingItems] = await Promise.all([
    prisma.campaign.findMany({
      include: { recipients: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.segment.findMany({
      select: { id: true, name: true, entityType: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getGeneralSettings(),
    prisma.marketingContent.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        contentType: true,
        channel: true,
        bodyHtml: true,
        bodyText: true,
        callToAction: true,
        imageUrl: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const campaignContentOptions = marketingItems.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    contentType: item.contentType,
    channel: item.channel,
    bodyHtml: item.bodyHtml,
    bodyText: item.bodyText,
    callToAction: item.callToAction,
    imageUrl: item.imageUrl,
  }));

  return (
    <CampaignsPageClient
      initialCampaigns={campaigns}
      initialSegments={segments}
      initialDefaults={{
        fromName: settings.defaultFromName,
        fromEmail: settings.defaultFromEmail,
        replyTo: settings.defaultReplyTo,
        senderProfiles: settings.senderProfiles,
      }}
      initialMarketingContent={campaignContentOptions}
      isAdmin={appUser.role === "admin"}
    />
  );
}
