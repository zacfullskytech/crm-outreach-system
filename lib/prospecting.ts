import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeEmail, normalizeWebsite } from "@/lib/utils";
import { scoreProspect } from "@/lib/prospects";
import { searchWeb } from "@/lib/search-provider";

const SEARCH_USER_AGENT = "Mozilla/5.0 (compatible; FullSkyProspectingBot/1.0)";
const FALLBACK_BUSINESS_TERMS = ["company", "business", "services", "office", "clinic"];
const LOCATION_SPLIT_REGEX = /\s*,\s*/;
const AGGREGATOR_DOMAINS = [
  "yelp.com",
  "threebestrated.com",
  "mapquest.com",
  "yellowpages.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "tripadvisor.com",
  "carecredit.com",
];
const GENERIC_TITLE_PARTS = new Set(["home", "welcome", "24", "site", "homepage", "veterinarian", "veterinarians", "animal hospital", "vet", "veterinary clinic"]);
const INVALID_CONTACT_NAME_FRAGMENTS = ["started", "in the", "of", "resources", "hospital", "clinic", "welcome", "home"];
const EMERGENCY_HINTS = ["emergency vet", "emergency veterinary", "urgent care", "24-hour emergency", "24 hour emergency", "critical care"];
const SPECIALTY_HINTS = ["specialty practice", "specialist", "board-certified", "board certified", "surgery", "oncology", "neurology", "dermatology", "internal medicine"];
const INDEPENDENT_HINTS = ["independent", "locally owned", "family owned", "privately owned", "owner operated"];
const TITLE_PREFIX_STRIPPERS = [/^welcome to\s+/i, /^trusted\s+/i, /^top rated\s+/i, /^best\s+/i];
const GENERIC_TITLE_PATTERNS = [
  /^veterinarian in /i,
  /^veterinarians in /i,
  /^trusted veterinarians? in /i,
  /^animal hospital in /i,
  /^book online/i,
  /^hour emergency /i,
  /^emergency vet in /i,
];

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

export type DiscoveryRunResult = {
  candidates: DiscoveryCandidate[];
  mode: "web" | "seed" | "empty" | "blocked";
  provider: "brave";
  blockedReason?: string | null;
  queryCount: number;
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

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value.trim();
}

function extractPhones(text: string, websiteDomain?: string | null) {
  const emails = extractEmails(text);
  const domainEmails = websiteDomain ? emails.filter((email) => email.toLowerCase().endsWith(`@${websiteDomain}`)) : [];
  const matches = Array.from(new Set(text.match(/(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/g) || []));

  const scored = matches.map((phone) => {
    let score = 0;
    const normalized = normalizePhone(phone);
    if (/contact|call|phone|text|appointment|schedule/i.test(text.slice(Math.max(0, text.indexOf(phone) - 80), text.indexOf(phone) + 80))) {
      score += 3;
    }
    if (domainEmails.length > 0) {
      score += 1;
    }
    if (/fax/i.test(text.slice(Math.max(0, text.indexOf(phone) - 40), text.indexOf(phone) + 40))) {
      score -= 3;
    }
    return { phone: normalized, score };
  }).sort((a, b) => b.score - a.score);

  return scored.map((entry) => entry.phone).slice(0, 2);
}

function detectBusinessType(text: string, title?: string | null) {
  const value = text.toLowerCase();
  const titleValue = (title || "").toLowerCase();
  const emergencyHits = EMERGENCY_HINTS.filter((hint) => titleValue.includes(hint) || value.includes(hint)).length;
  const specialtyHits = SPECIALTY_HINTS.filter((hint) => titleValue.includes(hint) || value.includes(hint)).length;

  if (specialtyHits >= 2 || (specialtyHits >= 1 && /specialty\s+(care|services|hospital|clinic|practice)/i.test(value))) {
    return "Specialty Practice";
  }

  if (emergencyHits >= 2 || (emergencyHits >= 1 && /emergency\s+(care|services|hospital|clinic|vet|veterinary)/i.test(value) && /24\s*-?hour|critical care|urgent care/i.test(value))) {
    return "Emergency Practice";
  }

  if (INDEPENDENT_HINTS.some((hint) => value.includes(hint))) return "Independent Practice";

  if (titleValue.includes("hospital")) return "Hospital";
  if (titleValue.includes("clinic")) return "Clinic";
  return null;
}

function isLikelyPersonName(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 3) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (INVALID_CONTACT_NAME_FRAGMENTS.some((fragment) => normalized.includes(fragment))) {
    return false;
  }

  return words.every((word) => /^[A-Z][a-z'-]+$/.test(word));
}

function extractContactName(text: string) {
  const patterns = [
    /(?:dr\.?|doctor)\s+([A-Z][a-z'-]+\s+[A-Z][a-z'-]+)/,
    /(?:owner|founder|medical director|practice manager|office manager)[:\s-]+([A-Z][a-z'-]+\s+[A-Z][a-z'-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = match?.[1]?.trim();
    if (candidate && isLikelyPersonName(candidate)) {
      return candidate;
    }
  }

  return null;
}

function normalizeCompanyTitlePart(value: string) {
  let normalized = value
    .replace(/\s+/g, " ")
    .replace(/^\d+[-:\s]*/, "")
    .trim();

  for (const pattern of TITLE_PREFIX_STRIPPERS) {
    normalized = normalized.replace(pattern, "").trim();
  }

  normalized = normalized.replace(/^Veterinarian in [^|]+/i, "").trim();
  normalized = normalized.replace(/^Veterinarians in [^|]+/i, "").trim();
  normalized = normalized.replace(/^Trusted Veterinarians in [^|]+/i, "").trim();

  return normalized;
}

function extractCompanyName(title: string, url: string) {
  const parts = title
    .split(/[|\-–]/)
    .map((part) => normalizeCompanyTitlePart(part))
    .filter(Boolean);

  const scored = parts
    .map((part) => {
      const lower = part.toLowerCase();
      let score = 0;

      if (GENERIC_TITLE_PARTS.has(lower) || GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(part))) {
        score -= 6;
      }
      if (part.length >= 4) {
        score += 1;
      }
      if (/clinic|hospital|veterinary|vet|animal|care|center|centre|practice/i.test(part)) {
        score += 5;
      }
      if (/ in [A-Z][a-z]+|book online|trusted|top rated|welcome/i.test(part)) {
        score -= 2;
      }
      if (/^[A-Z]{3,8}$/.test(part)) {
        score += 2;
      }
      if (/^[A-Z][a-z]+\s+[A-Z][a-z]+\s+(Clinic|Hospital|Veterinary|Vet|Animal|Care)/.test(part)) {
        score += 3;
      }

      return { part, score };
    })
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.score > 1) {
    return normalizeCompanyTitlePart(scored[0].part);
  }

  const usable = parts.find((part) => !GENERIC_TITLE_PARTS.has(part.toLowerCase()) && !GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(part)) && part.length >= 4);
  if (usable) {
    return usable;
  }

  const domain = normalizeWebsite(url);
  if (domain) {
    const root = domain
      .replace(/^www\./, "")
      .split(".")
      .slice(0, -1)
      .join(" ")
      .replace(/[-_]/g, " ")
      .trim();
    return root || "Unknown prospect";
  }

  return "Unknown prospect";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseLocation(input: string) {
  const parts = input.split(LOCATION_SPLIT_REGEX).map((entry) => entry.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      city: parts[0] || null,
      state: parts[1]?.slice(0, 2).toUpperCase() || null,
      raw: input,
    };
  }

  const whitespaceParts = input.trim().split(/\s+/).filter(Boolean);
  if (whitespaceParts.length >= 2) {
    const stateWord = whitespaceParts[whitespaceParts.length - 1];
    const city = whitespaceParts.slice(0, -1).join(" ");
    return {
      city: city || input,
      state: stateWord.slice(0, 2).toUpperCase(),
      raw: input,
    };
  }

  return {
    city: parts[0] || input,
    state: null,
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
}): Promise<DiscoveryRunResult> {
  const geography = params.geography.filter(Boolean).slice(0, 6);
  const excludeKeywords = (params.excludeKeywords || []).filter(Boolean);
  const parsedLocations = geography.map(parseLocation);
  const queries = buildSearchQueries(params);
  const results: DiscoveryCandidate[] = [];
  let blockedReason: string | null = null;

  for (const query of queries) {
    const queryExclude = excludeKeywords.map((keyword) => ` -${keyword}`).join("");

    let matches: Array<{ url: string; rawTitle: string }> = [];
    try {
      const searchResults = await searchWeb(`${query}${queryExclude}`, 8);
      matches = searchResults.map((result) => ({
        url: result.url,
        rawTitle: result.title,
      }));
    } catch (error) {
      blockedReason = error instanceof Error ? error.message : "Brave Search blocked the discovery run.";
      break;
    }

    for (const match of matches) {
      const url = match.url?.replace(/&amp;/g, "&");
      const rawTitle = match.rawTitle?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (!url || !rawTitle) {
        continue;
      }

      const lower = `${rawTitle} ${url}`.toLowerCase();
      const domain = normalizeWebsite(url);
      if (domain && AGGREGATOR_DOMAINS.some((blockedDomain) => domain === blockedDomain || domain.endsWith(`.${blockedDomain}`))) {
        continue;
      }
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
      const websiteDomain = normalizeWebsite(url);
      const phones = extractPhones(combinedText, websiteDomain);
      const matchedLocation = parsedLocations.find((location) => {
        if (!location.city) {
          return false;
        }

        const cityMatch = new RegExp(`\\b${escapeRegExp(location.city.toLowerCase())}\\b`, "i").test(combinedLower);
        const stateMatch = location.state ? new RegExp(`\\b${escapeRegExp(location.state.toLowerCase())}\\b`, "i").test(combinedLower) : true;
        return cityMatch && stateMatch;
      }) || parsedLocations[0] || { city: null, state: null, raw: null };

      const website = websiteDomain ? `https://${websiteDomain}` : url;
      const companyName = extractCompanyName(rawTitle, url);
      const contactName = extractContactName(combinedText);
      const businessType = detectBusinessType(`${supporting.text.slice(0, 1600)} ${bodyText.slice(0, 800)}`, rawTitle);
      const confidenceSignals = [websiteDomain, emails[0], phones[0], contactName, businessType].filter(Boolean).length;

      if (companyName === "Unknown prospect") {
        continue;
      }

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

  const candidates = Array.from(deduped.values())
    .sort((a, b) => scoreProspectCandidate(b) - scoreProspectCandidate(a))
    .slice(0, 30);

  return {
    candidates,
    mode: blockedReason ? "blocked" : candidates.length > 0 ? "web" : "empty",
    provider: "brave",
    blockedReason,
    queryCount: queries.length,
  };
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
