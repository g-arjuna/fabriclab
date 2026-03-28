import { expect, test } from "@playwright/test";

import {
  appUrl,
  assertNoBrowserErrors,
  ensurePaidEntitlement,
  hasPaidEntitlement,
  learnerEmail,
  revokePaidEntitlement,
  signInWithMagicLink,
  trackErrors,
} from "./helpers/liveAuth";

test.describe.serial("Entitlement revoke smoke", () => {
  test("revoking paid access re-locks paid routes for a learner", async ({ browser, page }) => {
    const adminTracker = trackErrors(page);
    const learnerContext = await browser.newContext();
    const learnerPage = await learnerContext.newPage();
    const learnerTracker = trackErrors(learnerPage);
    const hadEntitlementBefore = await hasPaidEntitlement(learnerEmail);

    try {
      await ensurePaidEntitlement(learnerEmail);

      await signInWithMagicLink(learnerPage, learnerEmail);
      await learnerPage.goto(`${appUrl}/account`, { waitUntil: "domcontentloaded" });
      await expect(learnerPage.getByText(learnerEmail)).toBeVisible();
      await expect(learnerPage.getByText(/Standard learner account\./i)).toBeVisible();
      await expect(learnerPage.getByText(/Core paid unlocked/i)).toBeVisible();

      await learnerPage.goto(`${appUrl}/learn/ch3-the-cli`, { waitUntil: "domcontentloaded" });
      await expect(learnerPage.getByRole("heading", { name: /Chapter 3: The CLI/i })).toBeVisible();
      await expect(
        learnerPage.getByText(/The investigation always starts with the same three questions/i),
      ).toBeVisible();

      await learnerPage.goto(`${appUrl}/lab?lab=lab2-congestion`, { waitUntil: "domcontentloaded" });
      await expect(learnerPage.getByRole("heading", { name: /Diagnose fabric congestion/i })).toBeVisible();
      await expect(learnerPage.getByText(/Lab locked/i)).toHaveCount(0);

      await signInWithMagicLink(page);
      await page.goto(`${appUrl}/admin/releases`, { waitUntil: "domcontentloaded" });
      await page.getByPlaceholder("learner@fabriclab.dev").fill(learnerEmail);
      await page.getByRole("button", { name: "Revoke" }).click();
      await expect(page.getByText(`Revoked core_paid from ${learnerEmail}.`)).toBeVisible();
      await expect.poll(async () => await hasPaidEntitlement(learnerEmail)).toBe(false);

      await learnerPage.goto(`${appUrl}/account`, { waitUntil: "domcontentloaded" });
      await expect(learnerPage.getByText(/Free access only/i)).toBeVisible();

      await learnerPage.goto(`${appUrl}/learn/ch3-the-cli`, { waitUntil: "domcontentloaded" });
      await expect(learnerPage.getByText(/Chapter preview/i)).toBeVisible();
      await expect(
        learnerPage.getByText(/The full lesson stays hidden until paid access is granted/i),
      ).toBeVisible();

      await learnerPage.goto(`${appUrl}/lab?lab=lab2-congestion`, { waitUntil: "domcontentloaded" });
      await expect(learnerPage.getByText(/Lab locked/i)).toBeVisible();
      await expect(
        learnerPage.getByText(/The simulator, device sessions, and scoring stay unavailable/i),
      ).toBeVisible();

      assertNoBrowserErrors(adminTracker);
      assertNoBrowserErrors(learnerTracker);
    } finally {
      if (hadEntitlementBefore) {
        await ensurePaidEntitlement(learnerEmail);
      } else {
        await revokePaidEntitlement(learnerEmail);
      }

      await learnerContext.close();
    }
  });
});
