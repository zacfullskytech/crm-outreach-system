import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      recipients: {
        orderBy: { sentAt: "desc" },
        take: 200,
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const totals = {
    pending: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    unsubscribed: 0,
    failed: 0,
  };

  for (const recipient of campaign.recipients) {
    const key = recipient.status.toLowerCase() as keyof typeof totals;
    if (key in totals) {
      totals[key] += 1;
    }
  }

  return NextResponse.json({
    data: {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        sentAt: campaign.sentAt,
      },
      totals,
      recipientCount: campaign.recipients.length,
      recipients: campaign.recipients,
    },
  });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    await prisma.campaignRecipient.deleteMany({ where: { campaignId: id } });
    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete campaign." }, { status: 500 });
  }
}
