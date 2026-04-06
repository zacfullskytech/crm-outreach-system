import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeEmail, normalizeWebsite, splitName } from "@/lib/utils";

function pick(row: Record<string, string>, mapping: Record<string, string>, key: string) {
  const sourceKey = mapping[key];
  return sourceKey ? row[sourceKey] ?? null : null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await request.json();
  const rows = Array.isArray(payload.rows) ? (payload.rows as Record<string, string>[]) : [];

  if (rows.length === 0) {
    return NextResponse.json({ error: "rows are required for execution" }, { status: 400 });
  }

  const job = await prisma.importJob.findUnique({ where: { id } });
  if (!job || !job.mappingJson || typeof job.mappingJson !== "object") {
    return NextResponse.json({ error: "Import job mapping not found" }, { status: 404 });
  }

  const mapping = job.mappingJson as Record<string, string>;
  let createdCompanies = 0;
  let createdContacts = 0;

  for (const row of rows) {
    const companyName = pick(row, mapping, "company_name");
    const email = normalizeEmail(pick(row, mapping, "email"));
    const website = pick(row, mapping, "website");
    const city = pick(row, mapping, "city");
    const state = pick(row, mapping, "state");

    let company = null;

    if (website) {
      company = await prisma.company.findFirst({
        where: { emailDomain: normalizeWebsite(website) || undefined },
      });
    }

    if (!company && companyName) {
      company = await prisma.company.findFirst({
        where: { name: companyName, city: city || undefined, state: state || undefined },
      });
    }

    if (!company && companyName) {
      company = await prisma.company.create({
        data: {
          name: companyName,
          website,
          emailDomain: normalizeWebsite(website),
          city,
          state,
          postalCode: pick(row, mapping, "postal_code"),
          industry: pick(row, mapping, "industry"),
          phone: pick(row, mapping, "company_phone"),
          source: pick(row, mapping, "source"),
          status: "LEAD",
        },
      });
      createdCompanies += 1;
    }

    if (email) {
      const existingContact = await prisma.contact.findUnique({ where: { email } });
      if (existingContact) {
        continue;
      }
    }

    const name = splitName(pick(row, mapping, "contact_name"));
    await prisma.contact.create({
      data: {
        companyId: company?.id,
        firstName: name.firstName,
        lastName: name.lastName,
        fullName: name.fullName,
        email,
        phone: pick(row, mapping, "phone"),
        source: pick(row, mapping, "source"),
        status: email ? "ACTIVE" : "DO_NOT_CONTACT",
      },
    });
    createdContacts += 1;

    await prisma.importRow.create({
      data: {
        importJobId: id,
        rawJson: row,
        status: "IMPORTED",
      },
    });
  }

  await prisma.importJob.update({
    where: { id },
    data: { status: "COMPLETED" },
  });

  return NextResponse.json({
    data: {
      createdCompanies,
      createdContacts,
      processedRows: rows.length,
    },
  });
}
