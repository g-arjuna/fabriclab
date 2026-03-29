import type { SupabaseClient } from "@supabase/supabase-js";

import { sendNotificationEmail } from "@/lib/notifications/mailgun";
import {
  listGlobalThreadActivityRecipients,
  listNewContentNotificationRecipients,
  listThreadActivityRecipients,
} from "@/lib/notifications/subscriptions";

type ContentNotificationInput = {
  admin: SupabaseClient;
  kind: "chapter" | "lab";
  title: string;
  slug: string;
  appUrl: string;
};

export async function notifyNewContentPublished(input: ContentNotificationInput) {
  const recipients = await listNewContentNotificationRecipients(input.admin);
  if (!recipients.length) {
    return;
  }

  const contentPath = input.kind === "chapter" ? `/learn/${input.slug}` : `/lab?lab=${encodeURIComponent(input.slug)}`;
  const subjectPrefix = input.kind === "chapter" ? "New chapter" : "New lab";

  await Promise.all(
    recipients.map((recipient) =>
      sendNotificationEmail({
        to: recipient.email,
        subject: `[FabricLab] ${subjectPrefix} published: ${input.title}`,
        text: [
          `A new ${input.kind} is now available in FabricLab.`,
          "",
          `Title: ${input.title}`,
          `Open: ${input.appUrl}${contentPath}`,
          "",
          "You can manage notification preferences from your account settings when available.",
        ].join("\n"),
      }),
    ),
  );
}

type ThreadNotificationInput = {
  admin: SupabaseClient;
  threadId: string;
  actorUserId: string;
  actorName: string;
  threadTitle: string;
  threadUrl: string;
  event: "thread_created" | "reply_posted";
};

export async function notifyThreadActivity(input: ThreadNotificationInput) {
  const recipients =
    input.event === "thread_created"
      ? await listGlobalThreadActivityRecipients(input.admin)
      : await listThreadActivityRecipients(input.admin, input.threadId);
  const filtered = recipients.filter((recipient) => recipient.user_id !== input.actorUserId);

  if (!filtered.length) {
    return;
  }

  const actionLabel = input.event === "thread_created" ? "created a new thread" : "replied to a thread";

  await Promise.all(
    filtered.map((recipient) =>
      sendNotificationEmail({
        to: recipient.email,
        subject: `[FabricLab] Thread update: ${input.threadTitle}`,
        text: [
          `${input.actorName} ${actionLabel}.`,
          "",
          `Thread: ${input.threadTitle}`,
          `Open: ${input.threadUrl}`,
          "",
          "You're receiving this because thread activity notifications are enabled.",
        ].join("\n"),
      }),
    ),
  );
}
