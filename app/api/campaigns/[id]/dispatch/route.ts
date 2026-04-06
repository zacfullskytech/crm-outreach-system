import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, renderTemplate } from "@/lib/email";

const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.status !== "SENDING") {
    return NextResponse.json({ error: `Campaign is not in SENDING state (current: ${campaign.status})` }, { status: 400 });
  }

  const pending = await prisma.campaignRecipient.findMany({
    where: { campaignId: id, status: "PENDING" },
    take: 500,
  });

  if (pending.length === 0) {
    await prisma.campaign.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });

    return NextResponse.json({ data: { sent: 0, message: "No pending recipients, campaign marked SENT" } });
  }

  const appUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  let sent = 0;
  let failed = 0;

  const batches: typeof pending[] = [];
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    batches.push(pending.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    await Promise.all(
      batch.map(async (recipient) => {
        const mergeData = (recipient.snapshotDataJson as Record<string, string | null | undefined>) || {};

        // Append unsubscribe link
        const unsub = `${appUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}&token=placeholder&campaign=${id}`;
        const htmlWithUnsub = renderTemplate(campaign.templateHtml, mergeData) +
          `<p style="font-size:11px;color:#999;margin-top:32px;">To unsubscribe, <a href="${unsub}">click here</a>.</p>`;
        const textWithUnsub = renderTemplate(campaign.templateText || "", mergeData) +
          `\n\nTo unsubscribe, visit: ${unsub}`;

        const result = await sendEmail({
          to: recipient.email,
          from: campaign.fromEmail,
          fromName: campaign.fromName || undefined,
          replyTo: campaign.replyTo || undefined,
          subject: renderTemplate(campaign.subject, mergeData),
          html: htmlWithUnsub,
          text: textWithUnsub,
        });

        if (result.success) {
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "SENT",
              sentAt: new Date(),
              providerMessageId: result.messageId || null,
            },
          });
          sent += 1;
        } else {
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "FAILED",
              errorMessage: result.error || "Unknown send error",
            },
          });
          failed += 1;
        }
      }),
    );

    if (batches.indexOf(batch) < batches.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const remaining = await prisma.campaignRecipient.count({
    where: { campaignId: id, status: "PENDING" },
  });

  if (remaining === 0) {
    await prisma.campaign.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });
  }

  return NextResponse.json({ data: { sent, failed, remaining } });
}
