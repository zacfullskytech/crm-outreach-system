type SegmentRule = {
  field: string;
  comparator: string;
  value?: unknown;
};

type SegmentGroup = {
  operator: "AND" | "OR";
  rules: Array<SegmentRule | SegmentGroup>;
};

function isGroup(rule: SegmentRule | SegmentGroup): rule is SegmentGroup {
  return "operator" in rule && Array.isArray(rule.rules);
}

function flattenRules(group: SegmentGroup): SegmentRule[] {
  return group.rules.flatMap((rule) => (isGroup(rule) ? flattenRules(rule) : [rule]));
}

export function describeSegmentIntent(segment: { name: string; description: string | null; filterJson: unknown }) {
  const group = segment.filterJson as SegmentGroup;
  const rules = flattenRules(group);

  const industryRule = rules.find((rule) => rule.field.endsWith("industry") && rule.comparator === "equals");
  const stateRule = rules.find((rule) => rule.field.endsWith("state") && rule.comparator === "equals");
  const missingServiceRule = rules.find((rule) => (rule.field === "services" || rule.field === "company.services") && rule.comparator === "not_has");
  const presentServiceRule = rules.find((rule) => (rule.field === "services" || rule.field === "company.services") && rule.comparator === "has");

  const industry = typeof industryRule?.value === "string" ? industryRule.value : null;
  const state = typeof stateRule?.value === "string" ? stateRule.value : null;
  const missingService = typeof missingServiceRule?.value === "string" ? missingServiceRule.value : null;
  const presentService = typeof presentServiceRule?.value === "string" ? presentServiceRule.value : null;

  const audience = industry ? `${industry} clients` : segment.name;
  const serviceLine = missingService || presentService || null;
  const offerType = missingService ? "Upsell campaign" : presentService ? "Cross-sell campaign" : null;

  const narrative = [
    `Segment: ${segment.name}`,
    segment.description ? `Description: ${segment.description}` : null,
    industry ? `Industry focus: ${industry}` : null,
    state ? `Geography focus: ${state}` : null,
    missingService ? `Opportunity: target accounts not currently using ${missingService}.` : null,
    presentService ? `Opportunity: target accounts currently using ${presentService}.` : null,
  ].filter(Boolean).join("\n");

  return {
    audience,
    industry,
    serviceLine,
    offerType,
    lifecycleStage: missingService || presentService ? "Upsell" : null,
    description: narrative || segment.description || segment.name,
    promptNotes: narrative,
  };
}
