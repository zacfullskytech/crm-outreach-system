import { requireAuth } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";
import { MarketingContentManager } from "@/components/marketing-content-manager";

export const dynamic = "force-dynamic";

function normalizeJsonStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

export default async function MarketingContentPage() {
  const { appUser } = await requireAuth();

  const [items, segments] = await Promise.all([
    prisma.marketingContent.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.segment.findMany({
      where: { entityType: { in: ["contact", "company", "prospect"] } },
      select: { id: true, name: true, entityType: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const resolvedItems = items.map((item) => ({
    ...item,
    tagsJson: normalizeJsonStringArray(item.tagsJson),
    taxonomyJson: normalizeJsonStringArray(item.taxonomyJson),
  }));

  return <MarketingContentManager initialItems={resolvedItems} initialSegments={segments} isAdmin={appUser.role === "admin"} />;
}
