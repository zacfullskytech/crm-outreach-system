import { resolvePromptTemplate } from "@/lib/marketing-prompts";

type GenerateMarketingAssetInput = {
  title: string;
  contentType: string;
  audience?: string | null;
  serviceLine?: string | null;
  channel?: string | null;
  industry?: string | null;
  offerType?: string | null;
  assetFormat?: string | null;
  tone?: string | null;
  lifecycleStage?: string | null;
  description?: string | null;
  promptNotes?: string | null;
  promptTemplateKey?: string | null;
  variables?: Record<string, string>;
  existingDraft?: {
    headline?: string | null;
    subheadline?: string | null;
    bodyText?: string | null;
    callToAction?: string | null;
    imagePrompt?: string | null;
    tags?: string[];
    taxonomy?: string[];
  } | null;
  revisionNotes?: string | null;
};

function requireOpenAiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return apiKey;
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function buildPrompt(input: GenerateMarketingAssetInput) {
  const template = resolvePromptTemplate({
    promptTemplateKey: input.promptTemplateKey,
    audience: input.audience,
    serviceLine: input.serviceLine,
  });
  const variableLines = Object.entries(input.variables || {})
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");
  const existingDraft = input.existingDraft;
  const existingDraftLines = existingDraft
    ? [
        `Headline: ${existingDraft.headline || "None"}`,
        `Subheadline: ${existingDraft.subheadline || "None"}`,
        `Body text: ${existingDraft.bodyText || "None"}`,
        `Call to action: ${existingDraft.callToAction || "None"}`,
        `Image prompt: ${existingDraft.imagePrompt || "None"}`,
        `Tags: ${existingDraft.tags?.join(", ") || "None"}`,
        `Taxonomy: ${existingDraft.taxonomy?.join(", ") || "None"}`,
      ].join("\n")
    : "";

  return [
    "You are a B2B marketing strategist and copywriter.",
    existingDraft ? "Revise the existing draft using the new revision instructions while preserving any strong parts that still fit." : "Generate structured marketing content for a telecom/IT services company.",
    `Asset title: ${input.title}`,
    `Content type: ${input.contentType}`,
    `Audience: ${input.audience || "Unspecified"}`,
    `Service line: ${input.serviceLine || "Unspecified"}`,
    `Channel: ${input.channel || "Unspecified"}`,
    `Industry: ${input.industry || "Unspecified"}`,
    `Offer type: ${input.offerType || "Unspecified"}`,
    `Asset format: ${input.assetFormat || "Unspecified"}`,
    `Lifecycle stage: ${input.lifecycleStage || "Unspecified"}`,
    `Tone: ${input.tone || template?.tone || "Unspecified"}`,
    template ? `Guardrails:\n${template.guardrails.map((line) => `- ${line}`).join("\n")}` : "Guardrails: none",
    `Description/context: ${input.description || "None provided"}`,
    `Prompt notes: ${input.promptNotes || "None provided"}`,
    variableLines ? `Variables:\n${variableLines}` : "Variables: none",
    existingDraftLines ? `Existing draft:\n${existingDraftLines}` : "",
    input.revisionNotes ? `Revision instructions:\n${input.revisionNotes}` : "",
    "Return JSON with keys: headline, subheadline, bodyText, callToAction, imagePrompt, tags, taxonomy.",
    "tags must be an array of short strings.",
    "bodyText should be concise but useful for a first draft.",
    existingDraft ? "Return a full revised draft, not partial diffs or commentary." : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function generateMarketingAsset(input: GenerateMarketingAssetInput) {
  const apiKey = requireOpenAiKey();
  const prompt = buildPrompt(input);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You generate clean JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error?.message || `OpenAI error ${response.status}`);
  }

  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned no content.");
  }

  const parsed = JSON.parse(content) as {
    headline?: string;
    subheadline?: string;
    bodyText?: string;
    callToAction?: string;
    imagePrompt?: string;
    tags?: unknown;
    taxonomy?: unknown;
  };

  return {
    ...parsed,
    tags: normalizeStringArray(parsed.tags),
    taxonomy: normalizeStringArray(parsed.taxonomy),
  };
}

export async function generateMarketingImage(prompt: string) {
  const apiKey = requireOpenAiKey();

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error?.message || `OpenAI image error ${response.status}`);
  }

  const image = body.data?.[0]?.b64_json;
  if (!image) {
    throw new Error("OpenAI returned no image data.");
  }

  return image as string;
}
