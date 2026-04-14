type SearchResult = {
  title: string;
  url: string;
  snippet?: string | null;
};

function requireBraveApiKey() {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new Error("BRAVE_API_KEY is not configured.");
  }
  return apiKey;
}

export async function searchWeb(query: string, count = 8): Promise<SearchResult[]> {
  const apiKey = requireBraveApiKey();

  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      body?.error?.detail || body?.message || `Brave Search error ${response.status}`,
    );
  }

  const results = Array.isArray(body?.web?.results) ? body.web.results : [];

  return results
    .map((item: { title?: unknown; url?: unknown; description?: unknown }) => ({
      title: typeof item.title === "string" ? item.title.trim() : "",
      url: typeof item.url === "string" ? item.url.trim() : "",
      snippet: typeof item.description === "string" ? item.description.trim() : null,
    }))
    .filter((item: SearchResult) => item.title && item.url);
}
