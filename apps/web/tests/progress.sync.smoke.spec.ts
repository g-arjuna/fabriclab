import { expect, test } from "@playwright/test";

import {
  appUrl,
  assertNoBrowserErrors,
  clearChapterProgress,
  findUserIdByEmail,
  readChapterProgress,
  signInWithSession,
  trackErrors,
} from "./helpers/liveAuth";

const targetChapter = "ch0-hardware-foundations";

test.describe.serial("Progress sync smoke", () => {
  test("guest is prompted to sign in before chapter progress can start", async ({ page }) => {
    const tracker = trackErrors(page);
    const userId = await findUserIdByEmail();
    await clearChapterProgress(userId, targetChapter);

    await page.goto(`${appUrl}/learn/${targetChapter}?page=1`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /The Hardware Story/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign in to continue/i })).toBeVisible();

    const localSnapshotValue = await page.evaluate(() => window.localStorage.getItem("fabriclab-progress"));
    expect(localSnapshotValue).toBeNull();
    await expect.poll(async () => await readChapterProgress(userId, targetChapter)).toBeNull();

    assertNoBrowserErrors(tracker);
  });

  test("signed-in chapter progress syncs to Supabase", async ({ page }) => {
    const tracker = trackErrors(page);
    const userId = await findUserIdByEmail();
    await clearChapterProgress(userId, targetChapter);

    await signInWithSession(page);
    await page.goto(`${appUrl}/learn/${targetChapter}?page=0`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /The Hardware Story/i })).toBeVisible();
    await expect
      .poll(async () => await readChapterProgress(userId, targetChapter), {
        timeout: 30_000,
        intervals: [1_000, 2_000, 3_000],
      })
      .toMatchObject({
        chapter_slug: targetChapter,
        completed_pages: [0],
        last_page_index: 0,
      });

    await page.goto(`${appUrl}/learn/${targetChapter}?page=1`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Act 1/i })).toBeVisible();

    await expect
      .poll(async () => await readChapterProgress(userId, targetChapter), {
        timeout: 30_000,
        intervals: [1_000, 2_000, 3_000],
      })
      .toMatchObject({
        chapter_slug: targetChapter,
        last_page_index: 1,
      });

    const progressRow = await readChapterProgress(userId, targetChapter);
    expect(progressRow?.completed_pages).toEqual(expect.arrayContaining([0, 1]));

    assertNoBrowserErrors(tracker);
  });
});
