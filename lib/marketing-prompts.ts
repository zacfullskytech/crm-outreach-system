type PromptTemplate = {
  key: string;
  label: string;
  audience?: string;
  serviceLine?: string;
  tone: string;
  guardrails: string[];
};

export const marketingPromptTemplates: PromptTemplate[] = [
  {
    key: "veterinary-phones",
    label: "Veterinary clinics · Phones",
    audience: "Veterinary clinics",
    serviceLine: "Phones",
    tone: "Practical, reassuring, operations-focused",
    guardrails: [
      "Avoid generic enterprise jargon.",
      "Emphasize uptime, front-desk reliability, and patient-owner experience.",
      "Keep claims concrete and believable.",
    ],
  },
  {
    key: "veterinary-internet",
    label: "Veterinary clinics · Internet",
    audience: "Veterinary clinics",
    serviceLine: "Internet",
    tone: "Credible, local, continuity-focused",
    guardrails: [
      "Stress reliability, failover, and support responsiveness.",
      "Do not overpromise on impossible outage prevention.",
    ],
  },
  {
    key: "medical-phones",
    label: "Private medical practices · Phones",
    audience: "Private medical practices",
    serviceLine: "Phones",
    tone: "Professional, efficiency-focused, patient-friendly",
    guardrails: [
      "Highlight scheduling, call routing, voicemail handling, and staff efficiency.",
      "Do not imply clinical outcomes or medical guarantees.",
    ],
  },
  {
    key: "medical-internet",
    label: "Private medical practices · Internet",
    audience: "Private medical practices",
    serviceLine: "Internet",
    tone: "Professional, continuity-focused, low-drama",
    guardrails: [
      "Focus on connectivity reliability for scheduling, EMR access, and patient communication.",
      "Avoid technical overload unless specifically asked.",
    ],
  },
];

export function resolvePromptTemplate({
  promptTemplateKey,
  audience,
  serviceLine,
}: {
  promptTemplateKey?: string | null;
  audience?: string | null;
  serviceLine?: string | null;
}) {
  if (promptTemplateKey) {
    const byKey = marketingPromptTemplates.find((template) => template.key === promptTemplateKey);
    if (byKey) return byKey;
  }

  return marketingPromptTemplates.find(
    (template) =>
      (!template.audience || template.audience === audience) &&
      (!template.serviceLine || template.serviceLine === serviceLine),
  );
}
