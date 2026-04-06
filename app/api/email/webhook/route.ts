import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const provider = process.env.EMAIL_PROVIDER || "resend";
  const secret = process.env.EMAIL_WEBHOOK_SECRET;

  // In production, verify the webhook signature from the provider here
  if (secret) {
    const sig = request.headers.get("x-webhook-signature") || request.headers.get("x-resend-signature") || "";
    if (!sig) {
      return NextResponse.json({ error: "Missing webhook signature" }, { status: 401 });
    }
    // TODO: HMAC verification against `secret`
  }

  const payload = await request.json();

  // Normalize across providers — this handles Resend-style event shapes
  const eventType = payload.type || payload.event || "unknown";
  const email = (payload.data?.to?.[0] || payload.email || payload.recipient || "").trim().toLowerCase();
  const messageId = payload.data?.email_id || payload.message_id || payload.id || null;

  if (!email) {
    return NextResponse.json({ error: "Could not resolve recipient email" }, { status: 400 });
  }

  // Find the campaign recipient by provider message ID or email + recent pending
  let recipient = null;

  if (messageId) {
    recipient = await prisma.campaignRecipient.findFirst({
      where: { providerMessageId: messageId },
    });
  }

  if (!recipient) {
    recipient = await prisma.campaignRecipient.findFirst({
      where: { email },
      orderBy: { sentAt: "desc" },
    });
  }

  if (recipient) {
    const statusMap: Record<string, string> = {
      "email.delivered": "DELIVERED",
      "email.opened": "OPENED",
      "email.clicked": "CLICKED",
      "email.bounced": "BOUNCED",
      "email.complained": "UNSUBSCRIBED",
      delivered: "DELIVERED",
      opened: "OPENED",
      clicked: "CLICKED",
      bounced: "BOUNCED",
      complained: "UNSUBSCRIBED",
    };

    const newStatus = statusMap[eventType];
    const dateMap: Record<string, string> = {
      DELIVERED: "sentAt",
      OPENED: "openedAt",
      CLICKED: "clickedAt",
      BOUNCED: "bouncedAt",
    };

    if (newStatus) {
      const dateField = dateMap[newStatus];
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: newStatus as never,
          ...(dateField ? { [dateField]: new Date() } : {}),
        },
      });
    }

    await prisma.emailEvent.create({
      data: {
        campaignRecipientId: recipient.id,
        eventType,
        eventPayloadJson: payload,
        occurredAt: new Date(),
      },
    });
  }

  // Auto-suppress on bounce or complaint
  if (eventType.includes("bounce") || eventType.includes("complain")) {
    const existing = await prisma.suppression.findUnique({ where: { email } });
    if (!existing) {
      await prisma.suppression.create({
        data: {
          email,
          reason: eventType.includes("bounce") ? "BOUNCE" : "COMPLAINT",
          source: `webhook-${provider}`,
        },
      });
    }

    await prisma.contact.updateMany({
      where: { email },
      data: { status: eventType.includes("bounce") ? "BOUNCED" : "UNSUBSCRIBED" },
    });
  }

  return NextResponse.json({ ok: true });
}
