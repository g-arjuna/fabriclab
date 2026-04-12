import type { SupabaseClient } from "@supabase/supabase-js";

import { sendNotificationEmail } from "@/lib/notifications/mailgun";
import {
  listGlobalThreadActivityRecipients,
  listNewContentNotificationRecipients,
  listThreadActivityRecipients,
} from "@/lib/notifications/subscriptions";
import { getAdminSupabaseEnv } from "@/lib/supabase/env";

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

type AdminCommunityNotificationInput = {
  actorName: string;
  actorEmail?: string | null;
  event:
    | "content_comment_created"
    | "content_comment_replied"
    | "tracked_discussion_created"
    | "tracked_discussion_replied"
    | "general_thread_created"
    | "general_thread_replied";
  subjectLabel: string;
  targetLabel: string;
  targetUrl: string;
  bodyPreview: string;
};

type CommentReplyTargetNotificationInput = {
  recipientEmail: string | null;
  recipientName: string;
  actorEmail?: string | null;
  actorName: string;
  targetType: "comment" | "reply";
  contentLabel: string;
  targetUrl: string;
  bodyPreview: string;
};

function getAdminNotificationRecipients() {
  const adminEnv = getAdminSupabaseEnv();
  if (!adminEnv) {
    return [];
  }

  return Array.from(
    new Set(
      adminEnv.adminEmails
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function getAdminEventLabel(event: AdminCommunityNotificationInput["event"]) {
  switch (event) {
    case "content_comment_created":
      return "posted a chapter/lab comment";
    case "content_comment_replied":
      return "replied to a chapter/lab comment";
    case "tracked_discussion_created":
      return "opened a tracked discussion";
    case "tracked_discussion_replied":
      return "replied to a tracked discussion";
    case "general_thread_created":
      return "opened a general forum thread";
    case "general_thread_replied":
      return "replied in the general forum";
    default:
      return "triggered a community event";
  }
}

export async function notifyAdminsOfCommunityActivity(input: AdminCommunityNotificationInput) {
  const recipients = getAdminNotificationRecipients();
  if (!recipients.length) {
    return;
  }

  await Promise.all(
    recipients.map((recipient) =>
      sendNotificationEmail({
        to: recipient,
        subject: `[FabricLab] Community activity: ${input.subjectLabel}`,
        text: [
          `${input.actorName} ${getAdminEventLabel(input.event)}.`,
          "",
          `Target: ${input.targetLabel}`,
          `Subject: ${input.subjectLabel}`,
          `Open: ${input.targetUrl}`,
          "",
          "Preview:",
          input.bodyPreview,
        ].join("\n"),
      }),
      ),
  );
}

export async function notifyCommentReplyTarget(input: CommentReplyTargetNotificationInput) {
  const recipientEmail = input.recipientEmail?.trim().toLowerCase() ?? "";
  const actorEmail = input.actorEmail?.trim().toLowerCase() ?? "";

  if (!recipientEmail || recipientEmail === actorEmail) {
    return;
  }

  const subjectTarget = input.targetType === "comment" ? "comment" : "reply";

  await sendNotificationEmail({
    to: recipientEmail,
    subject: `[FabricLab] New reply to your ${subjectTarget}`,
    text: [
      `Hi ${input.recipientName},`,
      "",
      `${input.actorName} replied to your ${subjectTarget}.`,
      "",
      `Context: ${input.contentLabel}`,
      `Open: ${input.targetUrl}`,
      "",
      "Reply preview:",
      input.bodyPreview,
    ].join("\n"),
  });
}
