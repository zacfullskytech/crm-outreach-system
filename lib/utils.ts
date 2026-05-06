export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

export function normalizeEmailList(emails?: Array<string | null | undefined> | null) {
  if (!emails?.length) {
    return [];
  }

  return Array.from(
    new Set(
      emails
        .map((email) => normalizeEmail(email))
        .filter((email): email is string => Boolean(email)),
    ),
  );
}

export function normalizeWebsite(website?: string | null) {
  if (!website) {
    return null;
  }

  const trimmed = website.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

export function splitName(fullName?: string | null) {
  if (!fullName) {
    return { firstName: null, lastName: null, fullName: null };
  }

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null, fullName: fullName.trim() };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.slice(-1).join(" "),
    fullName: fullName.trim(),
  };
}
