import { requireAuth } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";
import { getBlobNameFromUrl, getMarketingImageSignedUrl } from "@/lib/file-storage";
import { MarketingContentManager } from "@/components/marketing-content-manager";

export const dynamic = "force-dynamic";

export default async function MarketingContentPage() {
  const { appUser } = await requireAuth();

  const items = await prisma.marketingContent.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const resolvedItems = items.map((item) => {
    if (!item.imageUrl) {
      return item;
    }

    const blobName = getBlobNameFromUrl(item.imageUrl);
    if (!blobName) {
      return item;
    }

    return {
      ...item,
      imageUrl: getMarketingImageSignedUrl(blobName),
    };
  });

  return <MarketingContentManager initialItems={resolvedItems} isAdmin={appUser.role === "admin"} />;
}
