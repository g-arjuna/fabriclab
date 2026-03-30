import { expect, test } from "@playwright/test";

import {
  appUrl,
  assertNoBrowserErrors,
  ensurePaidEntitlement,
  hasPaidEntitlement,
  learnerEmail,
  revokePaidEntitlement,
  signInWithSession,
  trackErrors,
} from "./helpers/liveAuth";

test.describe.serial("Legacy entitlement revoke smoke", () => {
  test("revoking legacy test access does not affect signed-in learner access", async ({ browser, page }) => {
    const adminTracker = trackErrors(page);
    const learnerContext = await browser.newContext();
    const learnerPage = await learnerContext.newPage();
    const learnerTracker = trackErrors(learnerPage);
    const hadEntitlementBefore = await hasPaidEntitlement(learnerEmail);

    try {
      await ensurePaidEntitlement(learnerEmail);

      await signInWithSession(learnerPage, learnerEmail);
      await learnerPage.goto(`${appUrl}/account`, { waitUntil: "domcontentloaded" });
      await expect(learnerPage.getByText(learnerEmail)).toBeVisible();
      await expect(learnerPage.getByText(/Standard learner account\./i)).toBeVisible();
      await expect(learnerPage.getByText(/Signed-in learner access/i)).toBeVisible();

      await learnerPage.goto(`${appUrl}/learn/ch3-the-cli`, { waitUntil: "domcontentloaded" });
      await expect(
        learnerPage.getByRole("heading", { name: /Chapter 3: The CLI|The CLI - Reading the Fabric/i }),
      ).toBeVisible();
      await expect(
        learnerPage.getByText(/The investigation always starts with the same three questions/i),
      ).toBeVisible();

      await learnerPage.goto(`${appUrl}/lab?lab=lab2-congestion`, { waitUntil: "domcontentloaded" });
      await expect(learnerPage.getByRole("heading", { name: /Diagnose fabric congestion/i })).toBeVisible();
      await expect(learnerPage.getByText(/GPU training throughput has dropped 40%/i)).toBeVisible();

      await signInWithSession(page);
      await page.goto(`${appUrl}/admin/releases`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
      await page.getByPlaceholder("learner@fabriclab.dev").fill(learnerEmail);
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/api/admin/entitlements") &&
            response.request().method() === "DELETE" &&
            response.status() === 200,
        ),
        page.getByRole("button", { name: "Revoke" }).click(),
      ]);
      await expect.poll(async () => await hasPaidEntitlement(learnerEmail)).toBe(false);

      await learnerPage.goto(`${appUrl}/account`, { waitUntil: "domcontentloaded" });
      await expect(learnerPage.getByText(/Signed-in learner access/i)).toBeVisible();

      await learnerPage.goto(`${appUrl}/learn/ch3-the-cli`, { waitUntil: "domcontentloaded" });
      await expect(
        learnerPage.getByRole("heading", { name: /Chapter 3: The CLI|The CLI - Reading the Fabric/i }),
      ).toBeVisible();
      await expect(
        learnerPage.getByText(/The investigation always starts with the same three questions/i),
      ).toBeVisible();

      await learnerPage.goto(`${appUrl}/lab?lab=lab2-congestion`, { waitUntil: "domcontentloaded" });
      await expect(learnerPage.getByRole("heading", { name: /Diagnose fabric congestion/i })).toBeVisible();
      await expect(learnerPage.getByText(/GPU training throughput has dropped 40%/i)).toBeVisible();

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
