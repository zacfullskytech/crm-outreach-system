import { prisma } from "@/lib/db";

export type SenderProfile = {
  id: string;
  label: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
};

export type GeneralSettings = {
  defaultFromName: string;
  defaultFromEmail: string;
  defaultReplyTo: string;
  emailProvider: string;
  internalTestEmail: string;
  targetStates: string[];
  senderProfiles: SenderProfile[];
};

const GENERAL_SETTINGS_KEY = "general";

const generalDefaults: GeneralSettings = {
  defaultFromName: process.env.DEFAULT_FROM_NAME || "Field Notes CRM",
  defaultFromEmail: process.env.DEFAULT_FROM_EMAIL || "campaigns@example.com",
  defaultReplyTo: "",
  emailProvider: process.env.EMAIL_PROVIDER || "resend",
  internalTestEmail: "",
  targetStates: ["TX"],
  senderProfiles: [
    {
      id: "default",
      label: "Default Sender",
      fromName: process.env.DEFAULT_FROM_NAME || "Field Notes CRM",
      fromEmail: process.env.DEFAULT_FROM_EMAIL || "campaigns@example.com",
      replyTo: "",
    },
  ],
};

export async function getGeneralSettings(): Promise<GeneralSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: GENERAL_SETTINGS_KEY } });
  if (!row || typeof row.value !== "object" || row.value === null) {
    return generalDefaults;
  }

  const merged = {
    ...generalDefaults,
    ...(row.value as object),
  } as GeneralSettings;

  const senderProfiles = Array.isArray((merged as { senderProfiles?: unknown }).senderProfiles)
    ? (merged as { senderProfiles: unknown[] }).senderProfiles
        .map((entry, index) => {
          if (!entry || typeof entry !== "object") return null;
          const value = entry as Record<string, unknown>;
          const fromEmail = typeof value.fromEmail === "string" ? value.fromEmail.trim() : "";
          if (!fromEmail) return null;
          return {
            id: typeof value.id === "string" && value.id.trim() ? value.id.trim() : `sender-${index + 1}`,
            label: typeof value.label === "string" && value.label.trim() ? value.label.trim() : fromEmail,
            fromName: typeof value.fromName === "string" ? value.fromName.trim() : "",
            fromEmail,
            replyTo: typeof value.replyTo === "string" ? value.replyTo.trim() : "",
          } satisfies SenderProfile;
        })
        .filter((entry): entry is SenderProfile => Boolean(entry))
    : generalDefaults.senderProfiles;

  return {
    ...merged,
    senderProfiles: senderProfiles.length > 0 ? senderProfiles : generalDefaults.senderProfiles,
  };
}

export async function setGeneralSettings(value: GeneralSettings) {
  return prisma.appSetting.upsert({
    where: { key: GENERAL_SETTINGS_KEY },
    update: { value },
    create: { key: GENERAL_SETTINGS_KEY, value },
  });
}
