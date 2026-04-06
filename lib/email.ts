type MergeData = Record<string, string | null | undefined>;

export function renderTemplate(template: string, data: MergeData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = data[key];
    return value != null ? value : "";
  });
}

export interface EmailMessage {
  to: string;
  from: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const provider = process.env.EMAIL_PROVIDER || "resend";

  if (provider === "resend") {
    return sendViaResend(message);
  }

  if (provider === "mailgun") {
    return sendViaMailgun(message);
  }

  // Dry-run fallback — log to console but don't actually send
  console.log("[email:dry-run]", JSON.stringify(message, null, 2));
  return { success: true, messageId: `dry-run-${Date.now()}` };
}

async function sendViaResend(message: EmailMessage): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: message.fromName ? `${message.fromName} <${message.from}>` : message.from,
        to: [message.to],
        reply_to: message.replyTo || undefined,
        subject: message.subject,
        html: message.html,
        text: message.text || undefined,
      }),
    });

    const body = await response.json();

    if (!response.ok) {
      return { success: false, error: body.message || `Resend error ${response.status}` };
    }

    return { success: true, messageId: body.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function sendViaMailgun(message: EmailMessage): Promise<EmailSendResult> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;

  if (!apiKey || !domain) {
    return { success: false, error: "MAILGUN_API_KEY or MAILGUN_DOMAIN not configured" };
  }

  try {
    const form = new FormData();
    form.append("from", message.fromName ? `${message.fromName} <${message.from}>` : message.from);
    form.append("to", message.to);
    form.append("subject", message.subject);
    form.append("html", message.html);
    if (message.text) form.append("text", message.text);
    if (message.replyTo) form.append("h:Reply-To", message.replyTo);

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      },
      body: form,
    });

    const body = await response.json();

    if (!response.ok) {
      return { success: false, error: body.message || `Mailgun error ${response.status}` };
    }

    return { success: true, messageId: body.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
