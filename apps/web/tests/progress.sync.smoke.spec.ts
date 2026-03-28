import { expect, test } from "@playwright/test";

import {
  appUrl,
  assertNoBrowserErrors,
  clearChapterProgress,
  findUserIdByEmail,
  readChapterProgress,
  signInWithMagicLink,
  trackErrors,
} from "./helpers/liveAuth";

const targetChapter = "ch0-hardware-foundations";

test.describe.serial("Progress sync smoke", () => {
  test("guest chapter progress stays local", async ({ page }) => {
    const tracker = trackErrors(page);
    const userId = await findUserIdByEmail();
    await clearChapterProgress(userId, targetChapter);

    await page.goto(`${appUrl}/learn/${targetChapter}?page=1`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Act 1 - The normal server|Act 1 — The normal server/i })).toBeVisible();

    await expect
      .poll(async () => {
        return await page.evaluate(() => window.localStorage.getItem("fabriclab-progress"));
      })
      .not.toBeNull();

    const localSnapshotValue = await page.evaluate(() => window.localStorage.getItem("fabriclab-progress"));
    expect(localSnapshotValue).not.toBeNull();

    expect(localSnapshotValue).toContain(targetChapter);
    expect(localSnapshotValue).toContain("1");
    await expect.poll(async () => await readChapterProgress(userId, targetChapter)).toBeNull();

    assertNoBrowserErrors(tracker);
  });

  test("signed-in chapter progress syncs to Supabase", async ({ page }) => {
    const tracker = trackErrors(page);
    const userId = await findUserIdByEmail();
    await clearChapterProgress(userId, targetChapter);

    await signInWithMagicLink(page);
    await page.goto(`${appUrl}/learn/${targetChapter}?page=0`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /The Hardware Story/i })).toBeVisible();

    await page.goto(`${appUrl}/learn/${targetChapter}?page=1`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Act 1 - The normal server|Act 1 — The normal server/i })).toBeVisible();

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
