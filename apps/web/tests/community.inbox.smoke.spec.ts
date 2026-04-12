import { expect, test } from "@playwright/test";

import {
  assertNoBrowserErrors,
  createAdminClient,
  signInWithSession,
  smokeEmail,
  trackErrors,
} from "./helpers/liveAuth";

const replyEmail = `community-replies-${Date.now()}@fabriclab.dev`;
const commentBody = `Community reply smoke comment ${Date.now()} for Chapter 0 visibility.`;
const replyBody = `Community reply smoke follow-up ${Date.now()} for admin inbox visibility.`;

async function dismissNotificationPrompt(page: Parameters<typeof trackErrors>[0]) {
  const dialog = page.getByRole("heading", {
    name: /Choose what FabricLab should email you about/i,
  });

  if (await dialog.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /Not now/i }).click();
    await expect(dialog).toHaveCount(0);
  }
}

async function cleanupCommunityCommentArtifacts() {
  const admin = createAdminClient();
  const { data: comments, error: commentError } = await admin
    .from("community_comments")
    .select("id")
    .eq("content_kind", "chapter")
    .eq("content_slug", "ch0-hardware-foundations")
    .eq("body", commentBody);

  expect(commentError, commentError?.message ?? "Failed to locate smoke comment rows").toBeNull();

  const commentIds = (comments ?? []).map((row: { id: string }) => row.id);
  if (!commentIds.length) {
    return;
  }

  const { error: deleteRepliesError } = await admin
    .from("community_comment_replies")
    .delete()
    .in("comment_id", commentIds);
  expect(deleteRepliesError, deleteRepliesError?.message ?? "Failed to delete smoke comment replies").toBeNull();

  const { error: deleteCommentsError } = await admin
    .from("community_comments")
    .delete()
    .in("id", commentIds);
  expect(deleteCommentsError, deleteCommentsError?.message ?? "Failed to delete smoke comments").toBeNull();
}

test.describe.serial("Community inbox and quick-comment reply smoke", () => {
  test("quick comments accept replies and surface activity in the admin inbox", async ({ page }) => {
    const tracker = trackErrors(page);

    await cleanupCommunityCommentArtifacts();

    await signInWithSession(page, replyEmail);
    await page.goto("/learn/ch0-hardware-foundations", { waitUntil: "domcontentloaded" });
    await dismissNotificationPrompt(page);

    await page
      .getByPlaceholder(/Describe the technical correction, issue, or question clearly\./i)
      .fill(commentBody);
    await page.getByRole("button", { name: /Post comment/i }).click();
    await expect(page.getByText(/Comment posted\./i)).toBeVisible();

    await dismissNotificationPrompt(page);
    await page.getByRole("button", { name: /Reply to comment/i }).first().click();
    await page
      .getByPlaceholder(/Reply to this comment with additional context or a follow-up\./i)
      .fill(replyBody);
    await page.getByRole("button", { name: /^Reply$/i }).click();
    await expect(page.getByText(replyBody)).toBeVisible();

    await page.context().clearCookies();
    await signInWithSession(page, smokeEmail);
    await page.goto("/admin/community", { waitUntil: "domcontentloaded" });
    await dismissNotificationPrompt(page);

    await expect(page.getByRole("heading", { name: /See what changed across comments and discussions/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(commentBody);
    await expect(page.locator("body")).toContainText(replyBody);

    await cleanupCommunityCommentArtifacts();
    assertNoBrowserErrors(tracker);
  });
});
