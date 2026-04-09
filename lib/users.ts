import { prisma } from "@/lib/db";

export const DEFAULT_ADMIN_EMAIL = "zac@fullskytech.com";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function ensurePlatformUser(email: string, name?: string | null) {
  const normalizedEmail = normalizeEmail(email);

  return prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: name ?? undefined,
      role: normalizedEmail === DEFAULT_ADMIN_EMAIL ? "admin" : undefined,
    },
    create: {
      email: normalizedEmail,
      name: name ?? null,
      role: normalizedEmail === DEFAULT_ADMIN_EMAIL ? "admin" : "member",
    },
  });
}

export function isProtectedAdmin(email: string) {
  return normalizeEmail(email) === DEFAULT_ADMIN_EMAIL;
}
