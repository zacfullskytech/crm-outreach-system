import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeEmail, normalizeWebsite } from "@/lib/utils";
import { scoreProspect } from "@/lib/prospects";

type DiscoveryCandidate = {
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  businessType?: string | null;
  city?: string | null;
  state?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  evidenceJson?: Prisma.InputJsonValue;
};

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

function extractEmails(text: string) {
  return Array.from(new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])).slice(0, 3);
}

function extractPhones(text: string) {
  return Array.from(new Set(text.match(/(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/g) || [])).slice(0, 2);
}

function detectBusinessType(text: string) {
  const value = text.toLowerCase();
  if (value.includes("emergency")) return "Emergency Practice";
  if (value.includes("specialty")) return "Specialty Practice";
  if (value.includes("independent")) return "Independent Practice";
  if (value.includes("hospital")) return "Hospital";
  if (value.includes("clinic")) return "Clinic";
  return null;
}

function extractCompanyName(title: string, url: string) {
  const cleanTitle = title.split(/[|\-–]/)[0]?.trim();
  if (cleanTitle) return cleanTitle;
  const domain = normalizeWebsite(url);
  return domain ? domain.replace(/\.[a-z]+$/, "").replace(/[-_]/g, " ") : "Unknown prospect";
}

export async function discoverProspectCandidates(params: {
  industry?: string | null;
  geography: string[];
  includeKeywords?: string[];
  excludeKeywords?: string[];
  companyTypes?: string[];
}) {
  const geography = params.geography.filter(Boolean).slice(0, 5);
  const includeKeywords = (params.includeKeywords || []).filter(Boolean);
  const excludeKeywords = (params.excludeKeywords || []).filter(Boolean);
  const companyTypes = (params.companyTypes || []).filter(Boolean);

  const queries = geography.flatMap((location) => {
    const baseTerms = [params.industry, ...includeKeywords, ...companyTypes].filter(Boolean);
    const termSet = baseTerms.length > 0 ? baseTerms : ["business"];
    return termSet.slice(0, 3).map((term) => `${term} ${location}`.trim());
  });

  const results: DiscoveryCandidate[] = [];

  for (const query of queries.slice(0, 8)) {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FullSkyProspectingBot/1.0)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      continue;
    }

    const html = await response.text();
    const matches = Array.from(html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g)).slice(0, 5);

    for (const match of matches) {
      const url = match[1]?.replace(/&amp;/g, "&");
      const rawTitle = match[2]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (!url || !rawTitle) {
        continue;
      }

      const lower = `${rawTitle} ${url}`.toLowerCase();
      if (excludeKeywords.some((keyword) => lower.includes(keyword.toLowerCase()))) {
        continue;
      }

      let bodyText = "";
      try {
        const pageResponse = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; FullSkyProspectingBot/1.0)",
          },
          cache: "no-store",
        });
        if (pageResponse.ok) {
          const pageHtml = await pageResponse.text();
          bodyText = pageHtml
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 6000);
        }
      } catch {
        // Ignore fetch failures for individual pages; search result evidence is still useful.
      }

      const emails = extractEmails(bodyText);
      const phones = extractPhones(bodyText);
      const cityState = geography.find((entry) => lower.includes(entry.toLowerCase())) || geography[0] || null;
      const city = cityState?.split(",")[0]?.trim() || null;
      const state = cityState?.split(",")[1]?.trim()?.slice(0, 2).toUpperCase() || null;
      const website = normalizeWebsite(url) ? `https://${normalizeWebsite(url)}` : url;
      const companyName = extractCompanyName(rawTitle, url);

      results.push({
        companyName,
        email: emails[0] || null,
        phone: phones[0] || null,
        website,
        industry: params.industry || includeKeywords[0] || null,
        businessType: detectBusinessType(`${rawTitle} ${bodyText}`),
        city,
        state,
        source: "Web discovery",
        sourceUrl: url,
        evidenceJson: [
          { kind: "search_query", value: query },
          { kind: "title", value: rawTitle },
          { kind: "emails", value: emails },
          { kind: "phones", value: phones },
        ],
      });
    }
  }

  const deduped = new Map<string, DiscoveryCandidate>();
  for (const item of results) {
    const key = [item.companyName.toLowerCase(), normalizeWebsite(item.website) || item.sourceUrl || ""].join("::");
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  return Array.from(deduped.values()).slice(0, 20);
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
