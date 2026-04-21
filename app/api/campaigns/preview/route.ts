import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildWhereFromSegment } from "@/lib/filters";

export async function GET(request: NextRequest) {
  const segmentId = request.nextUrl.searchParams.get("segmentId");
  if (!segmentId) {
    return NextResponse.json({ error: "segmentId is required" }, { status: 400 });
  }

  const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
  if (!segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }

  const where = buildWhereFromSegment(segment.filterJson as never);
  const suppressedEmails = new Set(
    (await prisma.suppression.findMany({ select: { email: true } })).map((entry) => entry.email),
  );

  if (segment.entityType === "company") {
    const includeContacts = JSON.stringify(segment.filterJson).includes('"customFields.also_send_company_contacts"') && JSON.stringify(segment.filterJson).includes('"true"');
    const companies = await prisma.company.findMany({
      where: where as never,
      include: { contacts: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const companyEligible = companies.filter((company) => Boolean(company.email) && !suppressedEmails.has(company.email!));
    const contactEligible = includeContacts
      ? companies.flatMap((company) => company.contacts.filter((contact) => Boolean(contact.email) && !suppressedEmails.has(contact.email!) && !["UNSUBSCRIBED", "BOUNCED", "INVALID", "DO_NOT_CONTACT"].includes(contact.status)))
      : [];

    return NextResponse.json({
      count: companies.length,
      eligibleCount: companyEligible.length + contactEligible.length,
      sample: companyEligible.slice(0, 10).map((company) => ({
        id: company.id,
        fullName: company.name,
        email: company.email,
        company: { name: company.name },
      })),
    });
  }

  if (segment.entityType !== "contact") {
    return NextResponse.json(
      { error: `Campaign preview does not support segment type ${segment.entityType}.` },
      { status: 400 },
    );
  }

  const baseContacts = await prisma.contact.findMany({
    where: where as never,
    include: { company: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const eligible = baseContacts.filter((contact) =>
    Boolean(contact.email) &&
    !suppressedEmails.has(contact.email!) &&
    !["UNSUBSCRIBED", "BOUNCED", "INVALID", "DO_NOT_CONTACT"].includes(contact.status),
  );

  return NextResponse.json({
    count: baseContacts.length,
    eligibleCount: eligible.length,
    sample: eligible.slice(0, 10),
  });
}
