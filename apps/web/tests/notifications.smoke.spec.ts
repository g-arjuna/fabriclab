import { expect, test } from "@playwright/test";

import {
  appUrl,
  assertNoBrowserErrors,
  createAdminClient,
  findUserIdByEmail,
  signInWithSession,
  trackErrors,
} from "./helpers/liveAuth";

type SubscriptionRow = {
  email: string;
  notify_new_content: boolean;
  notify_thread_activity: boolean;
  preferences_confirmed: boolean;
};

const onboardingEmail = `notifications-onboarding-${Date.now()}@fabriclab.dev`;

async function clearNotificationState(email: string) {
  const userId = await findUserIdByEmail(email);
  const admin = createAdminClient();
  const { error } = await admin.from("email_subscriptions").delete().eq("user_id", userId);
  expect(error, error?.message ?? `Failed to clear notification state for ${email}`).toBeNull();
  return userId;
}

async function readNotificationState(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_subscriptions")
    .select("email, notify_new_content, notify_thread_activity, preferences_confirmed")
    .eq("user_id", userId)
    .maybeSingle<SubscriptionRow>();

  expect(error, error?.message ?? `Failed to read notification state for ${userId}`).toBeNull();
  return data as SubscriptionRow | null;
}

test.describe.serial("Notification onboarding and preference smoke", () => {
  test("first sign-in prompts for email preferences and persists them", async ({ page }) => {
    const tracker = trackErrors(page);
    const userId = await clearNotificationState(onboardingEmail);

    await signInWithSession(page, onboardingEmail);

    const dialog = page.getByRole("heading", {
      name: /Choose what FabricLab should email you about/i,
    });
    await expect(dialog).toBeVisible();

    const newContentCheckbox = page.getByRole("checkbox", {
      name: /New chapter and lab releases/i,
    });
    const repliesCheckbox = page.getByRole("checkbox", {
      name: /Replies to discussions I join/i,
    });

    await expect(newContentCheckbox).toBeChecked();
    await expect(repliesCheckbox).toBeChecked();

    await repliesCheckbox.uncheck();
    await dialog
      .locator("..")
      .getByRole("button", { name: /Save preferences/i })
      .click();

    await expect(dialog).toHaveCount(0);

    const subscription = await readNotificationState(userId);
    expect(subscription).toBeTruthy();
    expect(subscription?.preferences_confirmed).toBe(true);
    expect(subscription?.notify_new_content).toBe(true);
    expect(subscription?.notify_thread_activity).toBe(false);
    expect(subscription?.email).toBe(onboardingEmail);

    await page.goto("/account", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Email preferences/i })).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: /Notify me about new content/i }),
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: /Notify me about discussion replies/i }),
    ).not.toBeChecked();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(dialog).toHaveCount(0);

    assertNoBrowserErrors(tracker);
  });

  test("discussion forms expose explicit reply-notification opt-ins", async ({ page }) => {
    const tracker = trackErrors(page);

    await signInWithSession(page, onboardingEmail);

    await page.goto("/community", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("checkbox", { name: /Email me about replies to this discussion/i }),
    ).toBeVisible();

    await page.goto("/learn/ch3-the-cli", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("checkbox", { name: /Email me about replies to this discussion/i }),
    ).toBeVisible();

    assertNoBrowserErrors(tracker);
  });

  test("GitHub issue mirroring status is still surfaced during discussion creation", async ({ page }) => {
    const tracker = trackErrors(page);
    const uniqueTitle = `Notification smoke thread ${Date.now()}`;
    const admin = createAdminClient();

    await signInWithSession(page, onboardingEmail);
    const probeResponse = await page.request.get(`${appUrl}/api/community/threads?type=general`);
    const probePayload = (await probeResponse.json().catch(() => null)) as
      | { setupPending?: boolean; error?: string }
      | null;
    expect(
      probePayload?.setupPending ?? false,
      "Production is missing the community forum migration, so thread creation and GitHub mirroring cannot be verified yet.",
    ).toBe(false);
    await page.goto("/community", { waitUntil: "domcontentloaded" });

    await page.getByPlaceholder(/Missing vendor references in Chapter 5/i).fill(uniqueTitle);
    await page
      .getByPlaceholder(/Describe the idea, issue, or missing capability clearly enough/i)
      .fill("This is a live smoke test to verify GitHub issue mirroring status remains visible.");
    await page.getByRole("checkbox", { name: /Also open GitHub issue/i }).check();
    await page.getByRole("button", { name: /Create thread/i }).click();

    const successBanner = page
      .locator("text=/Discussion created( and mirrored to GitHub issue|, but GitHub issue mirroring was skipped)/i")
      .first();
    await expect(successBanner).toBeVisible();

    const bannerText = (await successBanner.textContent()) ?? "";
    expect(
      /Discussion created( and mirrored to GitHub issue|, but GitHub issue mirroring was skipped)/i.test(
        bannerText,
      ),
    ).toBe(true);

    const { data: rows, error } = await admin
      .from("community_threads")
      .select("id")
      .eq("title", uniqueTitle)
      .eq("thread_type", "general");

    expect(error, error?.message ?? "Failed to locate smoke test discussion thread").toBeNull();

    const threadIds = (rows ?? []).map((row: { id: string }) => row.id);
    if (threadIds.length > 0) {
      const { error: deletePostsError } = await admin
        .from("community_posts")
        .delete()
        .in("thread_id", threadIds);
      expect(deletePostsError, deletePostsError?.message ?? "Failed to clean smoke test replies").toBeNull();

      const { error: deleteThreadsError } = await admin.from("community_threads").delete().in("id", threadIds);
      expect(deleteThreadsError, deleteThreadsError?.message ?? "Failed to clean smoke test thread").toBeNull();
    }

    assertNoBrowserErrors(tracker);
  });
});
