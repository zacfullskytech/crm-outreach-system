import { prisma } from "@/lib/db";
import { normalizeEmail, normalizeWebsite } from "@/lib/utils";
import { scoreProspect } from "@/lib/prospects";

type ProspectMatchResult = {
  status: "NEW" | "POSSIBLE_MATCH" | "EXISTING_COMPANY" | "EXISTING_CONTACT";
  reason: string | null;
};

type ProspectLike = {
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  businessType?: string | null;
  city?: string | null;
  state?: string | null;
  contactName?: string | null;
};

export async function findProspectMatch(input: ProspectLike): Promise<ProspectMatchResult> {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedDomain = normalizeWebsite(input.website);
  const normalizedPhone = input.phone?.trim() || null;
  const normalizedCompanyName = input.companyName?.trim().toLowerCase() || null;

  if (normalizedEmail) {
    const existingContact = await prisma.contact.findFirst({
      where: { email: normalizedEmail },
      include: { company: true },
    });

    if (existingContact) {
      return {
        status: "EXISTING_CONTACT",
        reason: `Existing contact ${existingContact.email}${existingContact.company?.name ? ` at ${existingContact.company.name}` : ""}.`,
      };
    }
  }

  if (normalizedPhone) {
    const contactByPhone = await prisma.contact.findFirst({ where: { phone: normalizedPhone }, include: { company: true } });
    if (contactByPhone) {
      return {
        status: "EXISTING_CONTACT",
        reason: `Phone already belongs to contact${contactByPhone.company?.name ? ` at ${contactByPhone.company.name}` : ""}.`,
      };
    }

    const companyByPhone = await prisma.company.findFirst({ where: { phone: normalizedPhone } });
    if (companyByPhone) {
      return {
        status: "EXISTING_COMPANY",
        reason: `Phone already belongs to company ${companyByPhone.name}.`,
      };
    }
  }

  if (normalizedDomain) {
    const companyByDomain = await prisma.company.findFirst({
      where: {
        OR: [{ emailDomain: normalizedDomain }, { website: { contains: normalizedDomain, mode: "insensitive" } }],
      },
    });

    if (companyByDomain) {
      return {
        status: "EXISTING_COMPANY",
        reason: `Domain already matches company ${companyByDomain.name}.`,
      };
    }

    const contactByDomain = await prisma.contact.findFirst({
      where: { email: { endsWith: `@${normalizedDomain}`, mode: "insensitive" } },
      include: { company: true },
    });

    if (contactByDomain) {
      return {
        status: "EXISTING_CONTACT",
        reason: `Email domain already belongs to an existing contact${contactByDomain.company?.name ? ` at ${contactByDomain.company.name}` : ""}.`,
      };
    }
  }

  if (normalizedCompanyName) {
    const companyByName = await prisma.company.findFirst({
      where: { name: { equals: input.companyName?.trim() || "", mode: "insensitive" } },
    });

    if (companyByName) {
      return {
        status: "EXISTING_COMPANY",
        reason: `Company name already exists as ${companyByName.name}.`,
      };
    }

    const similarCompany = await prisma.company.findFirst({
      where: { name: { contains: input.companyName?.trim() || "", mode: "insensitive" } },
    });

    if (similarCompany) {
      return {
        status: "POSSIBLE_MATCH",
        reason: `Possible company match: ${similarCompany.name}.`,
      };
    }
  }

  return { status: "NEW", reason: null };
}

export function scoreProspectCandidate(input: ProspectLike) {
  return scoreProspect({
    industry: input.industry,
    state: input.state,
    city: input.city,
    website: input.website,
    email: input.email,
    contactName: input.contactName,
    businessType: input.businessType,
  });
}

export function buildSeedCandidates(params: {
  industry?: string | null;
  geography: string[];
  includeKeywords?: string[];
  companyTypes?: string[];
}) {
  const geography = params.geography.filter(Boolean);
  const includeKeywords = (params.includeKeywords || []).filter(Boolean);
  const companyTypes = (params.companyTypes || []).filter(Boolean);

  return geography.slice(0, 5).map((location, index) => {
    const companyType = companyTypes[index % Math.max(companyTypes.length, 1)] || "Independent Practice";
    const keyword = includeKeywords[index % Math.max(includeKeywords.length, 1)] || params.industry || "local services";
    const slug = `${keyword}-${location}-${index + 1}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    return {
      companyName: `${location} ${keyword} Collective ${index + 1}`,
      contactName: `Prospect Lead ${index + 1}`,
      email: `info@${slug}.example.com`,
      phone: `+1 555 01${String(index + 10).padStart(2, "0")}`,
      website: `https://${slug}.example.com`,
      industry: params.industry || keyword,
      businessType: companyType,
      city: location.split(",")[0]?.trim() || location,
      state: location.split(",")[1]?.trim()?.slice(0, 2).toUpperCase() || null,
      source: "AI prospecting seed",
      sourceUrl: `https://search.example.com/${slug}`,
      evidenceJson: [{ kind: "seed", note: `Seeded candidate for ${keyword} in ${location}.` }],
    };
  });
}
