import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const companyA = await prisma.company.upsert({
    where: { id: "seed-company-a" },
    update: {},
    create: {
      id: "seed-company-a",
      name: "North Ridge Veterinary Clinic",
      industry: "Veterinary",
      businessType: "Independent Clinic",
      website: "northridgevet.com",
      emailDomain: "northridgevet.com",
      city: "Dallas",
      state: "TX",
      status: "CLIENT",
      source: "seed",
    },
  });

  const companyB = await prisma.company.upsert({
    where: { id: "seed-company-b" },
    update: {},
    create: {
      id: "seed-company-b",
      name: "Cedar Park Family Medicine",
      industry: "Private Medical Practice",
      businessType: "Primary Care",
      website: "cedarparkfamilymed.com",
      emailDomain: "cedarparkfamilymed.com",
      city: "Austin",
      state: "TX",
      status: "LEAD",
      source: "seed",
    },
  });

  await prisma.contact.upsert({
    where: { email: "sarah@northridgevet.com" },
    update: {},
    create: {
      firstName: "Sarah",
      lastName: "Cole",
      fullName: "Sarah Cole",
      email: "sarah@northridgevet.com",
      phone: "+1-555-0101",
      status: "ACTIVE",
      source: "seed",
      companyId: companyA.id,
    },
  });

  await prisma.contact.upsert({
    where: { email: "dr.james@cedarparkfamilymed.com" },
    update: {},
    create: {
      firstName: "James",
      lastName: "Reed",
      fullName: "James Reed",
      email: "dr.james@cedarparkfamilymed.com",
      phone: "+1-555-0110",
      status: "ACTIVE",
      source: "seed",
      companyId: companyB.id,
    },
  });

  await prisma.segment.upsert({
    where: { id: "seed-segment-vet-texas" },
    update: {},
    create: {
      id: "seed-segment-vet-texas",
      name: "Texas Veterinary Contacts",
      entityType: "contact",
      filterJson: {
        operator: "AND",
        rules: [
          { field: "company.industry", comparator: "equals", value: "Veterinary" },
          { field: "company.state", comparator: "equals", value: "TX" },
          { field: "email", comparator: "is_not_empty" },
        ],
      },
    },
  });

  await prisma.campaign.upsert({
    where: { id: "seed-campaign-1" },
    update: {},
    create: {
      id: "seed-campaign-1",
      name: "Texas Vet Intro",
      subject: "Helping veterinary clinics tighten outreach",
      fromEmail: "campaigns@example.com",
      fromName: "Field Notes CRM",
      templateHtml: "<p>Hi {{first_name}},</p><p>We help independent clinics improve outreach operations.</p>",
      templateText: "Hi {{first_name}}, we help independent clinics improve outreach operations.",
      status: "DRAFT",
      segmentId: "seed-segment-vet-texas",
    },
  });

  await prisma.prospect.upsert({
    where: { id: "seed-prospect-1" },
    update: {},
    create: {
      id: "seed-prospect-1",
      companyName: "Blue River Animal Hospital",
      contactName: "Megan Lee",
      email: "megan@blueriveranimal.com",
      website: "blueriveranimal.com",
      industry: "Veterinary",
      businessType: "Independent Clinic",
      city: "Fort Worth",
      state: "TX",
      source: "seed",
      qualificationStatus: "QUALIFIED",
      score: 75,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
