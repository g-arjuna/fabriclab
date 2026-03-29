import { expect, test } from "@playwright/test";

import {
  appUrl,
  assertNoBrowserErrors,
  readCatalogState,
  signInWithMagicLink,
  trackErrors,
  updateCatalogState,
} from "./helpers/liveAuth";

const target = {
  kind: "chapter" as const,
  slug: "ch15-ip-routing-ai-fabrics",
  title: "IP Routing for AI/ML Fabrics",
  route: "/learn/ch15-ip-routing-ai-fabrics",
};

test.describe.serial("Admin release controls smoke", () => {
  test("admin can unpublish and restore a published chapter while keeping guest sign-in gating intact", async ({ browser, page }) => {
    const tracker = trackErrors(page);
    const original = await readCatalogState(target.kind, target.slug);
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();

    try {
      await signInWithMagicLink(page);

      await page.goto("/admin/releases", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
      const heading = page.getByRole("heading", { name: target.title });
      const card = heading.locator("xpath=ancestor::div[contains(@class,'rounded-3xl')][1]");

      await expect(heading).toBeVisible();

      await card.getByRole("button", { name: "Hidden" }).click();
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/api/admin/catalog") &&
            response.request().method() === "PATCH" &&
            response.status() === 200,
        ),
        card.getByRole("button", { name: "Save" }).click(),
      ]);
      await expect(card.getByRole("button", { name: "Save" })).toBeVisible();
      await expect.poll(async () => (await readCatalogState(target.kind, target.slug)).is_published).toBe(false);

      const hiddenResponse = await guestPage.goto(`${appUrl}${target.route}`, { waitUntil: "domcontentloaded" });
      expect(hiddenResponse?.status()).toBe(404);

      await card.getByRole("button", { name: "Live" }).click();
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/api/admin/catalog") &&
            response.request().method() === "PATCH" &&
            response.status() === 200,
        ),
        card.getByRole("button", { name: "Save" }).click(),
      ]);
      await expect(card.getByRole("button", { name: "Save" })).toBeVisible();
      await expect.poll(async () => (await readCatalogState(target.kind, target.slug)).is_published).toBe(true);

      const restoredResponse = await guestPage.goto(`${appUrl}${target.route}`, { waitUntil: "domcontentloaded" });
      expect(restoredResponse?.status()).toBe(200);
      await expect(guestPage.getByRole("heading", { name: target.title })).toBeVisible();
      await expect(guestPage.getByRole("link", { name: /Sign in to continue/i })).toBeVisible();

      assertNoBrowserErrors(tracker);
    } finally {
      await updateCatalogState(target.kind, target.slug, original);
    }
  });
});
