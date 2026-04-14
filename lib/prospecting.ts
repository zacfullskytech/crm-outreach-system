import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeEmail, normalizeWebsite } from "@/lib/utils";
import { scoreProspect } from "@/lib/prospects";

const SEARCH_USER_AGENT = "Mozilla/5.0 (compatible; FullSkyProspectingBot/1.0)";
const FALLBACK_BUSINESS_TERMS = ["company", "business", "services", "office", "clinic"];
const LOCATION_SPLIT_REGEX = /\s*,\s*/;

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

function extractContactName(text: string) {
  const patterns = [
    /(?:dr\.?|doctor)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/,
    /(?:owner|founder|medical director|practice manager|office manager)[:\s-]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractCompanyName(title: string, url: string) {
  const cleanTitle = title.split(/[|\-–]/)[0]?.trim();
  if (cleanTitle) return cleanTitle;
  const domain = normalizeWebsite(url);
  return domain ? domain.replace(/\.[a-z]+$/, "").replace(/[-_]/g, " ") : "Unknown prospect";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseLocation(input: string) {
  const parts = input.split(LOCATION_SPLIT_REGEX).map((entry) => entry.trim()).filter(Boolean);
  return {
    city: parts[0] || null,
    state: parts[1]?.slice(0, 2).toUpperCase() || null,
    raw: input,
  };
}

function buildSearchQueries(params: {
  industry?: string | null;
  geography: string[];
  includeKeywords?: string[];
  excludeKeywords?: string[];
  companyTypes?: string[];
}) {
  const locations = params.geography.filter(Boolean).slice(0, 6);
  const includeKeywords = (params.includeKeywords || []).filter(Boolean);
  const companyTypes = (params.companyTypes || []).filter(Boolean);
  const industry = params.industry?.trim() || null;
  const baseTerms = Array.from(new Set([industry, ...includeKeywords, ...companyTypes].filter((value): value is string => Boolean(value))));
  const searchTerms = baseTerms.length > 0 ? baseTerms : FALLBACK_BUSINESS_TERMS;
  const queries = new Set<string>();

  for (const location of locations) {
    queries.add(`${industry || searchTerms[0] || "business"} ${location}`.trim());
    queries.add(`${searchTerms[0] || "business"} in ${location}`.trim());
    queries.add(`${searchTerms[0] || "business"} near ${location}`.trim());

    for (const term of searchTerms.slice(0, 6)) {
      queries.add(`${term} ${location}`.trim());
      if (industry && term.toLowerCase() !== industry.toLowerCase()) {
        queries.add(`${industry} ${term} ${location}`.trim());
      }
    }
  }

  return Array.from(queries).slice(0, 18);
}

async function fetchPageText(url: string) {
  try {
    const pageResponse = await fetch(url, {
      headers: {
        "User-Agent": SEARCH_USER_AGENT,
      },
      cache: "no-store",
    });

    if (!pageResponse.ok) {
      return "";
    }

    const pageHtml = await pageResponse.text();
    return pageHtml
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);
  } catch {
    return "";
  }
}

async function fetchSupportingPageText(url: string) {
  const normalizedDomain = normalizeWebsite(url);
  if (!normalizedDomain) {
    return { supportingUrl: null, text: "" };
  }

  const paths = ["/contact", "/about", "/team", "/our-team", "/staff"];
  for (const path of paths) {
    const supportingUrl = `https://${normalizedDomain}${path}`;
    const text = await fetchPageText(supportingUrl);
    if (text) {
      return { supportingUrl, text };
    }
  }

  return { supportingUrl: null, text: "" };
}

export async function discoverProspectCandidates(params: {
  industry?: string | null;
  geography: string[];
  includeKeywords?: string[];
  excludeKeywords?: string[];
  companyTypes?: string[];
}) {
  const geography = params.geography.filter(Boolean).slice(0, 6);
  const excludeKeywords = (params.excludeKeywords || []).filter(Boolean);
  const parsedLocations = geography.map(parseLocation);
  const queries = buildSearchQueries(params);
  const results: DiscoveryCandidate[] = [];

  for (const query of queries) {
    const queryExclude = excludeKeywords.map((keyword) => ` -${keyword}`).join("");
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${query}${queryExclude}`)}`;

    let response: Response;
    try {
      response = await fetch(searchUrl, {
        headers: {
          "User-Agent": SEARCH_USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
        cache: "no-store",
      });
    } catch {
      continue;
    }

    if (!response.ok) {
      continue;
    }

    const html = await response.text();
    const matches = Array.from(html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g)).slice(0, 8);

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

      const bodyText = await fetchPageText(url);
      const supporting = await fetchSupportingPageText(url);
      const combinedText = `${bodyText} ${supporting.text}`.trim();
      const combinedLower = `${lower} ${combinedText.toLowerCase()}`;

      if (excludeKeywords.some((keyword) => combinedLower.includes(keyword.toLowerCase()))) {
        continue;
      }

      const emails = extractEmails(combinedText);
      const phones = extractPhones(combinedText);
      const matchedLocation = parsedLocations.find((location) => {
        if (!location.city) {
          return false;
        }

        const cityMatch = new RegExp(`\\b${escapeRegExp(location.city.toLowerCase())}\\b`, "i").test(combinedLower);
        const stateMatch = location.state ? new RegExp(`\\b${escapeRegExp(location.state.toLowerCase())}\\b`, "i").test(combinedLower) : true;
        return cityMatch && stateMatch;
      }) || parsedLocations[0] || { city: null, state: null, raw: null };

      const websiteDomain = normalizeWebsite(url);
      const website = websiteDomain ? `https://${websiteDomain}` : url;
      const companyName = extractCompanyName(rawTitle, url);
      const contactName = extractContactName(combinedText);
      const businessType = detectBusinessType(`${rawTitle} ${combinedText}`);
      const confidenceSignals = [websiteDomain, emails[0], phones[0], contactName, businessType].filter(Boolean).length;

      results.push({
        companyName,
        contactName,
        email: emails[0] || null,
        phone: phones[0] || null,
        website,
        industry: params.industry || params.includeKeywords?.[0] || null,
        businessType,
        city: matchedLocation.city,
        state: matchedLocation.state,
        source: "Web discovery",
        sourceUrl: url,
        evidenceJson: [
          { kind: "search_query", value: query },
          { kind: "title", value: rawTitle },
          { kind: "emails", value: emails },
          { kind: "phones", value: phones },
          { kind: "supporting_url", value: supporting.supportingUrl },
          { kind: "contact_name", value: contactName },
          { kind: "confidence_signals", value: confidenceSignals },
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

  return Array.from(deduped.values())
    .sort((a, b) => scoreProspectCandidate(b) - scoreProspectCandidate(a))
    .slice(0, 30);
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
