type ProspectScoreInput = {
  industry?: string | null;
  state?: string | null;
  city?: string | null;
  website?: string | null;
  email?: string | null;
  contactName?: string | null;
  employeeEstimate?: number | null;
  businessType?: string | null;
};

const TARGET_INDUSTRIES = new Set(["veterinary", "private medical practice"]);
const LARGE_ORG_HINTS = ["hospital", "health system", "group", "network"];

export function scoreProspect(input: ProspectScoreInput) {
  let score = 0;

  if (input.industry && TARGET_INDUSTRIES.has(input.industry.toLowerCase())) {
    score += 20;
  }

  if (input.state) {
    score += 10;
  }

  if (input.city) {
    score += 10;
  }

  if (input.website) {
    score += 10;
  }

  if (input.email) {
    score += 15;
  }

  if (input.contactName) {
    score += 10;
  }

  if (input.employeeEstimate && input.employeeEstimate > 100) {
    score -= 10;
  }

  if (input.businessType) {
    const normalized = input.businessType.toLowerCase();
    if (LARGE_ORG_HINTS.some((hint) => normalized.includes(hint))) {
      score -= 20;
    }
  }

  return score;
}
