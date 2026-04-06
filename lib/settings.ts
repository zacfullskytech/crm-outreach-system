import { prisma } from "@/lib/db";

export type GeneralSettings = {
  defaultFromName: string;
  defaultFromEmail: string;
  defaultReplyTo: string;
  emailProvider: string;
  internalTestEmail: string;
  targetStates: string[];
};

const GENERAL_SETTINGS_KEY = "general";

const generalDefaults: GeneralSettings = {
  defaultFromName: process.env.DEFAULT_FROM_NAME || "Field Notes CRM",
  defaultFromEmail: process.env.DEFAULT_FROM_EMAIL || "campaigns@example.com",
  defaultReplyTo: "",
  emailProvider: process.env.EMAIL_PROVIDER || "resend",
  internalTestEmail: "",
  targetStates: ["TX"],
};

export async function getGeneralSettings(): Promise<GeneralSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: GENERAL_SETTINGS_KEY } });
  if (!row || typeof row.value !== "object" || row.value === null) {
    return generalDefaults;
  }

  return {
    ...generalDefaults,
    ...(row.value as object),
  } as GeneralSettings;
}

export async function setGeneralSettings(value: GeneralSettings) {
  return prisma.appSetting.upsert({
    where: { key: GENERAL_SETTINGS_KEY },
    update: { value },
    create: { key: GENERAL_SETTINGS_KEY, value },
  });
}
