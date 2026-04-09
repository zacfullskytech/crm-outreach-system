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
};

function requireOpenAiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return apiKey;
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

  return [
    "You are a B2B marketing strategist and copywriter.",
    "Generate structured marketing content for a telecom/IT services company.",
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
    "Return JSON with keys: headline, subheadline, bodyText, callToAction, imagePrompt, tags, taxonomy.",
    "tags must be an array of short strings.",
    "bodyText should be concise but useful for a first draft.",
  ].join("\n\n");
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

  return JSON.parse(content) as {
    headline?: string;
    subheadline?: string;
    bodyText?: string;
    callToAction?: string;
    imagePrompt?: string;
    tags?: string[];
    taxonomy?: string[];
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

  return `data:image/png;base64,${image}`;
}
