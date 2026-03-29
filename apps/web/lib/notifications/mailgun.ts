const MAILGUN_API_BASE = (process.env.MAILGUN_API_BASE_URL ?? "https://api.mailgun.net/v3").replace(/\/+$/, "");

export type NotificationEmail = {
  to: string;
  subject: string;
  text: string;
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

export async function sendNotificationEmail(email: NotificationEmail): Promise<boolean> {
  const config = getMailgunConfig();
  if (!config) {
    return false;
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

  return response.ok;
}
