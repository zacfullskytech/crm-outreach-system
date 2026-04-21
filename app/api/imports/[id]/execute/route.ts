import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeEmail, normalizeWebsite, splitName } from "@/lib/utils";

function pick(row: Record<string, string>, mapping: Record<string, string>, key: string) {
  const sourceKey = mapping[key];
  return sourceKey ? row[sourceKey] ?? null : null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await request.json().catch(() => ({}));

  const job = await prisma.importJob.findUnique({
    where: { id },
    include: { rows: true },
  });

  if (!job || !job.mappingJson || typeof job.mappingJson !== "object") {
    return NextResponse.json({ error: "Import job mapping not found" }, { status: 404 });
  }

  if (job.rows.length === 0) {
    return NextResponse.json({ error: "No import rows found for this job" }, { status: 400 });
  }

  const mapping = job.mappingJson as Record<string, string>;
  let createdCompanies = 0;
  let createdContacts = 0;
  let processedRows = 0;

  for (const importRow of job.rows) {
    const row = importRow.rawJson && typeof importRow.rawJson === "object"
      ? importRow.rawJson as Record<string, string>
      : null;

    if (!row) {
      await prisma.importRow.update({
        where: { id: importRow.id },
        data: { status: "FAILED", errorMessage: "Invalid row payload" },
      });
      continue;
    }

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
        await prisma.importRow.update({
          where: { id: importRow.id },
          data: { status: "SKIPPED", errorMessage: "Contact already exists" },
        });
        processedRows += 1;
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
    processedRows += 1;

    await prisma.importRow.update({
      where: { id: importRow.id },
      data: {
        status: "IMPORTED",
        errorMessage: null,
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
      processedRows,
    },
  });
}
