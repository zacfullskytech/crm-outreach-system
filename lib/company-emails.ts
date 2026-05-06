import type { Prisma } from "@prisma/client";
import { normalizeEmailList } from "@/lib/utils";

export function getCompanyEmailList(company: { email?: string | null; emailsJson?: Prisma.JsonValue | null }) {
  const extraEmails = Array.isArray(company.emailsJson)
    ? company.emailsJson.filter((entry): entry is string => typeof entry === "string")
    : [];

  return normalizeEmailList([company.email, ...extraEmails]);
}
