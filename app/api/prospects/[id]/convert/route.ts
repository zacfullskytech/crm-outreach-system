import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeEmail, normalizeWebsite, splitName } from "@/lib/utils";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prospect = await prisma.prospect.findUnique({ where: { id } });

  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  const company = await prisma.company.create({
    data: {
      name: prospect.companyName,
      industry: prospect.industry,
      businessType: prospect.businessType,
      website: prospect.website,
      emailDomain: normalizeWebsite(prospect.website),
      phone: prospect.phone,
      addressLine1: prospect.addressLine1,
      city: prospect.city,
      state: prospect.state,
      postalCode: prospect.postalCode,
      country: prospect.country,
      latitude: prospect.latitude,
      longitude: prospect.longitude,
      employeeEstimate: prospect.employeeEstimate,
      status: "LEAD",
      source: prospect.source,
      notes: prospect.notes,
    },
  });

  let contact = null;
  if (prospect.contactName || prospect.email || prospect.phone) {
    const name = splitName(prospect.contactName);
    contact = await prisma.contact.create({
      data: {
        companyId: company.id,
        firstName: name.firstName,
        lastName: name.lastName,
        fullName: name.fullName,
        email: normalizeEmail(prospect.email),
        phone: prospect.phone,
        source: prospect.source,
        status: prospect.email ? "ACTIVE" : "DO_NOT_CONTACT",
      },
    });
  }

  await prisma.prospect.update({
    where: { id: prospect.id },
    data: { qualificationStatus: "CONVERTED" },
  });

  return NextResponse.json({ data: { company, contact } });
}
