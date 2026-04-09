type GenerateMarketingAssetInput = {
  title: string;
  contentType: string;
  audience?: string | null;
  serviceLine?: string | null;
  channel?: string | null;
  description?: string | null;
  promptNotes?: string | null;
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
    `Description/context: ${input.description || "None provided"}`,
    `Prompt notes: ${input.promptNotes || "None provided"}`,
    variableLines ? `Variables:\n${variableLines}` : "Variables: none",
    "Return JSON with keys: headline, subheadline, bodyText, callToAction, imagePrompt, tags.",
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
  };
}
