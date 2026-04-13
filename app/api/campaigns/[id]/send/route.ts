import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildWhereFromSegment } from "@/lib/filters";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
    return NextResponse.json({ error: `Campaign cannot be sent from status ${campaign.status}` }, { status: 400 });
  }

  if (!campaign.segmentId) {
    return NextResponse.json({ error: "Campaign has no segment assigned" }, { status: 400 });
  }

  const segment = await prisma.segment.findUnique({ where: { id: campaign.segmentId } });
  if (!segment) {
    return NextResponse.json({ error: "Linked segment not found" }, { status: 404 });
  }

  if (segment.entityType !== "contact") {
    return NextResponse.json(
      { error: `Campaign sending only supports contact segments right now. Linked segment type: ${segment.entityType}.` },
      { status: 400 },
    );
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

  const eligible = contacts.filter((c) => c.email && !suppressedEmails.has(c.email));

  if (eligible.length === 0) {
    return NextResponse.json({ error: "No eligible recipients after filtering and suppression checks" }, { status: 400 });
  }

  const recipients = eligible.map((contact) => ({
    campaignId: campaign.id,
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
    status: "PENDING" as const,
  }));

  await prisma.campaignRecipient.createMany({ data: recipients });

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "SENDING" },
  });

  return NextResponse.json({
    data: {
      campaignId: campaign.id,
      recipientCount: recipients.length,
      status: "SENDING",
    },
  });
}
