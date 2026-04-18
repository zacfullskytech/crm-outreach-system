import { Campaign, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildWhereFromSegment } from "@/lib/filters";
import { renderTemplate, sendEmail } from "@/lib/email";

const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 1500;

type SnapshotData = Record<string, string | null | undefined>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function prepareCampaignRecipients(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
    throw new Error(`Campaign cannot be sent from status ${campaign.status}`);
  }

  if (!campaign.segmentId) {
    throw new Error("Campaign has no segment assigned");
  }

  const segment = await prisma.segment.findUnique({ where: { id: campaign.segmentId } });
  if (!segment) {
    throw new Error("Linked segment not found");
  }

  if (segment.entityType !== "contact") {
    throw new Error(`Campaign sending only supports contact segments right now. Linked segment type: ${segment.entityType}.`);
  }

  const existingRecipients = await prisma.campaignRecipient.count({ where: { campaignId } });
  if (existingRecipients > 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "SENDING" },
    });

    return {
      campaignId,
      recipientCount: existingRecipients,
      status: "SENDING" as const,
      reusedExistingRecipients: true,
    };
  }

  const where = buildWhereFromSegment(segment.filterJson as never);

  const contacts = await prisma.contact.findMany({
    where: {
      AND: [
        where as never,
        { email: { not: null } },
        { email: { not: "" } },
        { status: { notIn: ["UNSUBSCRIBED", "BOUNCED", "INVALID", "DO_NOT_CONTACT"] } },
      ],
    },
    include: { company: true },
  });

  const suppressedEmails = new Set(
    (await prisma.suppression.findMany({ select: { email: true } })).map((s) => s.email),
  );

  const eligible = contacts.filter((contact) => contact.email && !suppressedEmails.has(contact.email));

  if (eligible.length === 0) {
    throw new Error("No eligible recipients after filtering and suppression checks");
  }

  const recipients: Prisma.CampaignRecipientCreateManyInput[] = eligible.map((contact) => ({
    campaignId,
    contactId: contact.id,
    email: contact.email!,
    snapshotDataJson: {
      contact_name: contact.fullName || [contact.firstName, contact.lastName].filter(Boolean).join(" "),
      first_name: contact.firstName,
      last_name: contact.lastName,
      company_name: contact.company?.name || null,
      city: contact.company?.city || null,
      state: contact.company?.state || null,
      industry: contact.company?.industry || null,
    },
    status: "PENDING",
  }));

  await prisma.campaignRecipient.createMany({ data: recipients });
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "SENDING" },
  });

  return {
    campaignId,
    recipientCount: recipients.length,
    status: "SENDING" as const,
    reusedExistingRecipients: false,
  };
}

export async function deliverCampaignRecipients(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  if (campaign.status === "SCHEDULED") {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "SENDING" },
    });
  } else if (campaign.status !== "SENDING") {
    throw new Error(`Campaign is not in SENDING state (current: ${campaign.status})`);
  }

  const pending = await prisma.campaignRecipient.findMany({
    where: { campaignId, status: "PENDING" },
    take: 500,
  });

  if (pending.length === 0) {
    const scheduledCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true, scheduledAt: true },
    });

    if (scheduledCampaign?.status === "SCHEDULED") {
      const prepared = await prepareCampaignRecipients(campaignId);
      return {
        sent: 0,
        failed: 0,
        remaining: prepared.recipientCount,
        message: "Recipients prepared for scheduled campaign delivery",
      };
    }
  }


  if (pending.length === 0) {
    const finalState = await finalizeCampaignDelivery(campaignId);
    return {
      sent: finalState.sent,
      failed: finalState.failed,
      remaining: finalState.remaining,
      message: finalState.message,
    };
  }

  const appUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  let sent = 0;
  let failed = 0;

  const batches: typeof pending[] = [];
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    batches.push(pending.slice(i, i + BATCH_SIZE));
  }

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];

    await Promise.all(
      batch.map(async (recipient) => {
        const mergeData = (recipient.snapshotDataJson as SnapshotData) || {};
        const unsub = `${appUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}&token=placeholder&campaign=${campaignId}`;
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
          return;
        }

        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "FAILED",
            errorMessage: result.error || "Unknown send error",
          },
        });
        failed += 1;
      }),
    );

    if (index < batches.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const remaining = await prisma.campaignRecipient.count({
    where: { campaignId, status: "PENDING" },
  });

  if (remaining === 0) {
    const finalState = await finalizeCampaignDelivery(campaignId);
    return {
      sent: finalState.sent,
      failed: finalState.failed,
      remaining: finalState.remaining,
      message: finalState.message,
    };
  }

  return { sent, failed, remaining };
}

async function finalizeCampaignDelivery(campaignId: string) {
  const [sentCount, failedCount, pendingCount] = await Promise.all([
    prisma.campaignRecipient.count({ where: { campaignId, status: "SENT" } }),
    prisma.campaignRecipient.count({ where: { campaignId, status: "FAILED" } }),
    prisma.campaignRecipient.count({ where: { campaignId, status: "PENDING" } }),
  ]);

  if (pendingCount > 0) {
    return {
      sent: sentCount,
      failed: failedCount,
      remaining: pendingCount,
      message: "Campaign still has pending recipients",
    };
  }

  const nextStatus = sentCount > 0 ? "SENT" : "FAILED";
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: nextStatus,
      sentAt: sentCount > 0 ? new Date() : null,
    },
  });

  return {
    sent: sentCount,
    failed: failedCount,
    remaining: 0,
    message: nextStatus === "SENT"
      ? "Campaign completed with at least one successful delivery"
      : "Campaign delivery failed for all recipients",
  };
}

export async function runCampaignNow(campaignId: string) {
  const prepared = await prepareCampaignRecipients(campaignId);
  const delivered = await deliverCampaignRecipients(campaignId);

  return {
    campaignId,
    prepared,
    delivered,
  };
}

export async function runDueScheduledCampaigns(now = new Date()) {
  const emailProvider = process.env.EMAIL_PROVIDER || "resend";
  const providerConfigOk =
    emailProvider === "dry-run" ||
    (emailProvider === "resend" && Boolean(process.env.RESEND_API_KEY)) ||
    (emailProvider === "mailgun" && Boolean(process.env.MAILGUN_API_KEY) && Boolean(process.env.MAILGUN_DOMAIN));

  const dueCampaigns = await prisma.campaign.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: "asc" },
    take: 25,
  });

  const results: Array<{
    campaignId: string;
    name: string;
    scheduledAt: Date | null;
    success: boolean;
    prepared?: Awaited<ReturnType<typeof prepareCampaignRecipients>>;
    delivered?: Awaited<ReturnType<typeof deliverCampaignRecipients>>;
    error?: string;
  }> = [];

  for (const campaign of dueCampaigns) {
    try {
      const prepared = await prepareCampaignRecipients(campaign.id);
      const delivered = await deliverCampaignRecipients(campaign.id);
      results.push({
        campaignId: campaign.id,
        name: campaign.name,
        scheduledAt: campaign.scheduledAt,
        success: true,
        prepared,
        delivered,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run campaign";
      await markCampaignFailedIfSendingStarted(campaign, message);
      results.push({
        campaignId: campaign.id,
        name: campaign.name,
        scheduledAt: campaign.scheduledAt,
        success: false,
        error: message,
      });
    }
  }

  return {
    processedAt: now,
    dueCount: dueCampaigns.length,
    successCount: results.filter((result) => result.success).length,
    failureCount: results.filter((result) => !result.success).length,
    runtime: {
      emailProvider,
      providerConfigOk,
      schedulerSecretConfigured: Boolean(process.env.SCHEDULER_SECRET?.trim()),
      appBaseUrl: process.env.APP_BASE_URL || null,
    },
    results,
  };
}

async function markCampaignFailedIfSendingStarted(campaign: Campaign, message: string) {
  const current = await prisma.campaign.findUnique({
    where: { id: campaign.id },
    select: { status: true },
  });

  if (current?.status === "SENDING") {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "FAILED" },
    });
  }

  console.error("[campaigns:runDueScheduledCampaigns]", campaign.id, message);
}
