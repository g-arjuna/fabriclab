const MAILGUN_API_BASE = (process.env.MAILGUN_API_BASE_URL ?? "https://api.mailgun.net/v3").replace(/\/+$/, "");

export type NotificationEmail = {
  to: string;
  subject: string;
  text: string;
};

export type NotificationEmailResult = {
  ok: boolean;
  status: number | null;
  reason:
    | "ok"
    | "missing_config"
    | "request_failed";
  message: string;
};

function getMailgunConfig() {
  const apiKey = process.env.MAILGUN_API_KEY?.trim();
  const domain = process.env.MAILGUN_DOMAIN?.trim();
  const fromEmail = process.env.MAIL_FROM_EMAIL?.trim();
  const fromName = process.env.MAIL_FROM_NAME?.trim() || "FabricLab";

  if (!apiKey || !domain || !fromEmail) {
    return null;
  }

  return {
    apiKey,
    domain,
    from: `${fromName} <${fromEmail}>`,
  };
}

export function isNotificationEmailConfigured() {
  return getMailgunConfig() !== null;
}

export async function sendNotificationEmailDetailed(
  email: NotificationEmail,
): Promise<NotificationEmailResult> {
  const config = getMailgunConfig();
  if (!config) {
    return {
      ok: false,
      status: null,
      reason: "missing_config",
      message:
        "Mailgun is not configured. Set MAILGUN_API_KEY, MAILGUN_DOMAIN, and MAIL_FROM_EMAIL.",
    };
  }

  const body = new URLSearchParams({
    from: config.from,
    to: email.to,
    subject: email.subject,
    text: email.text,
  });

  const response = await fetch(`${MAILGUN_API_BASE}/${config.domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${config.apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const message = (await response.text().catch(() => "")) || response.statusText || "Mailgun request completed.";

  return {
    ok: response.ok,
    status: response.status,
    reason: response.ok ? "ok" : "request_failed",
    message,
  };
}

export async function sendNotificationEmail(email: NotificationEmail): Promise<boolean> {
  const result = await sendNotificationEmailDetailed(email);
  return result.ok;
}
