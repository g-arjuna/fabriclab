import { NextResponse } from "next/server";

import { requireAdminViewer } from "@/lib/auth/server";
import {
  isNotificationEmailConfigured,
  sendNotificationEmailDetailed,
} from "@/lib/notifications/mailgun";

type NotificationTestBody = {
  to?: string;
  subject?: string;
  text?: string;
};

export async function POST(request: Request) {
  let viewer;
  try {
    viewer = await requireAdminViewer();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as NotificationTestBody | null;
  const to = body?.to?.trim().toLowerCase() || viewer.email;
  if (!to) {
    return NextResponse.json(
      { error: "A destination email is required. Sign in with an email-backed admin account or pass `to`." },
      { status: 400 },
    );
  }

  const subject = body?.subject?.trim() || "[FabricLab] Notification system test";
  const text =
    body?.text?.trim() ||
    [
      "This is a FabricLab notification test.",
      "",
      `Triggered by: ${viewer.email ?? "admin"}`,
      `Sent at: ${new Date().toISOString()}`,
    ].join("\n");

  const result = await sendNotificationEmailDetailed({
    to,
    subject,
    text,
  });

  return NextResponse.json({
    configured: isNotificationEmailConfigured(),
    to,
    subject,
    ...result,
  });
}
