export type CustomFieldMap = Record<string, string>;

export function normalizeCustomFieldKey(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

export function normalizeCustomFields(input: unknown): CustomFieldMap {
  if (!Array.isArray(input)) {
    return {};
  }

  const entries = input
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const key = "key" in item ? normalizeCustomFieldKey(String(item.key || "")) : "";
      const value = "value" in item ? String(item.value || "").trim() : "";

      if (!key || !value) {
        return null;
      }

      return [key, value] as const;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));

  return Object.fromEntries(entries);
}

export function customFieldsToPairs(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return [] as Array<{ key: string; value: string }>;
  }

  return Object.entries(input as Record<string, unknown>).map(([key, value]) => ({
    key,
    value: String(value ?? ""),
  }));
}
