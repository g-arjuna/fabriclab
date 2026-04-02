import { expect, test, type Page } from "@playwright/test";

import { createSessionCookie, getSessionCookieName } from "@/lib/auth/session";
import {
  assertNoBrowserErrors,
  ensurePaidEntitlement,
  findUserIdByEmail,
  smokeEmail,
  trackErrors,
} from "./helpers/liveAuth";

const chapters = [
  {
    path: "/learn/ch21-congestion-control-deep-dive",
    heading: /Chapter 21: Congestion Control Deep Dive|Congestion Control Deep Dive/i,
  },
  {
    path: "/learn/ch24-spectrum-x-architecture",
    heading: /Chapter 24: Spectrum-X Architecture|Spectrum-X Architecture and the AI Factory Platform/i,
  },
  {
    path: "/learn/ch25-roce-configuration-operations",
    heading: /Chapter 25: RoCE Configuration and Operations|RoCE Configuration and Operations on Spectrum-X/i,
  },
] as const;

test.use({
  viewport: { width: 390, height: 844 },
});

async function signInWithLocalSession(page: Page) {
  const userId = await findUserIdByEmail(smokeEmail);
  await ensurePaidEntitlement(smokeEmail);
  const session = await createSessionCookie({
    id: userId,
    email: smokeEmail,
    user_metadata: {
      full_name: null,
      name: null,
    },
  });

  expect(session, "Failed to mint a FabricLab session cookie").toBeTruthy();

  await page.context().addCookies([
    {
      name: getSessionCookieName(),
      value: session!,
      url: "http://127.0.0.1:3000",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);

  await page.goto("/api/auth/session", { waitUntil: "domcontentloaded" });
  const authPayload = JSON.parse((await page.locator("body").innerText()).trim()) as {
    authenticated?: boolean;
    user?: { email?: string | null } | null;
  };

  expect(authPayload.authenticated, `Session probe failed: ${JSON.stringify(authPayload)}`).toBe(true);
  expect(authPayload.user?.email?.toLowerCase()).toBe(smokeEmail.toLowerCase());

}

test.describe.serial("Late chapter mobile smoke", () => {
  test("signed-in mobile viewport renders late chapters without page overflow", async ({ page }) => {
    const tracker = trackErrors(page);

    const getPartSummary = () =>
      page
        .locator("span")
        .filter({ hasText: /^Part \d+ of \d+$/ })
        .first();

    await signInWithLocalSession(page);

    for (const chapter of chapters) {
      await page.goto(chapter.path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: chapter.heading })).toBeVisible();
      await expect(getPartSummary()).toBeVisible();

      const partSummaryText = await getPartSummary().innerText();
      const totalMatch = partSummaryText.match(/^Part \d+ of (\d+)$/);
      expect(totalMatch, `Unexpected part summary for ${chapter.path}: ${partSummaryText}`).not.toBeNull();
      const totalPages = Number(totalMatch?.[1]);

      const samplePages = [0];

      for (const pageNumber of samplePages) {
        await page.goto(`${chapter.path}?page=${pageNumber}`, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("link", { name: /Sign in to continue/i })).toHaveCount(0);

        const dimensions = await page.evaluate(() => ({
          innerWidth: window.innerWidth,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));

        expect(
          dimensions.scrollWidth,
          `${chapter.path}?page=${pageNumber} overflowed mobile viewport: ${JSON.stringify(dimensions)}`,
        ).toBeLessThanOrEqual(dimensions.clientWidth + 4);

        expect(
          tracker.pageErrors,
          `Page errors after ${chapter.path}?page=${pageNumber}:\n${tracker.pageErrors.join("\n")}`,
        ).toEqual([]);
      }
    }

    assertNoBrowserErrors(tracker);
  });
});
