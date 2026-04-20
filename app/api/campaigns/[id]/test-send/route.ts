import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, renderTemplate } from "@/lib/email";
import { getBlobNameFromUrl, getMarketingAssetAppUrl } from "@/lib/file-storage";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await request.json();
  const testEmail = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : null;

  if (!testEmail) {
    return NextResponse.json({ error: "email is required for test send" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const mergeData = {
    contact_name: "Test Recipient",
    first_name: "Test",
    last_name: "Recipient",
    company_name: "Sample Company",
    city: "Dallas",
    state: "TX",
    industry: "Veterinary",
  };

  const html = renderTemplate(campaign.templateHtml, mergeData).replace(/https:\/\/[^\s"')]+/g, (value) => {
    const blobName = getBlobNameFromUrl(value);
    return blobName ? getMarketingAssetAppUrl(blobName) : value;
  });

  const result = await sendEmail({
    to: testEmail,
    from: campaign.fromEmail,
    fromName: campaign.fromName || undefined,
    replyTo: campaign.replyTo || undefined,
    subject: `[TEST] ${renderTemplate(campaign.subject, mergeData)}`,
    html,
    text: campaign.templateText ? renderTemplate(campaign.templateText, mergeData) : undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error || "Test send failed" }, { status: 500 });
  }

  return NextResponse.json({ data: { messageId: result.messageId, sentTo: testEmail } });
}
