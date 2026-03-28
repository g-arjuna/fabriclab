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
  test("admin can unpublish and restore a paid chapter", async ({ browser, page }) => {
    const tracker = trackErrors(page);
    const original = await readCatalogState(target.kind, target.slug);
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();

    try {
      await signInWithMagicLink(page);

      await page.goto("/admin/releases", { waitUntil: "domcontentloaded" });
      const card = page.locator("div.rounded-3xl").filter({
        has: page.getByRole("heading", { name: target.title }),
      }).first();

      await expect(card.getByRole("heading", { name: target.title })).toBeVisible();

      await card.getByRole("button", { name: "Hidden" }).click();
      await card.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText(`Saved ${target.title}.`)).toBeVisible();
      await expect.poll(async () => (await readCatalogState(target.kind, target.slug)).is_published).toBe(false);

      const hiddenResponse = await guestPage.goto(`${appUrl}${target.route}`, { waitUntil: "domcontentloaded" });
      expect(hiddenResponse?.status()).toBe(404);

      await card.getByRole("button", { name: "Live" }).click();
      await card.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText(`Saved ${target.title}.`)).toBeVisible();
      await expect.poll(async () => (await readCatalogState(target.kind, target.slug)).is_published).toBe(true);

      const restoredResponse = await guestPage.goto(`${appUrl}${target.route}`, { waitUntil: "domcontentloaded" });
      expect(restoredResponse?.status()).toBe(200);
      await expect(guestPage.getByText(/Chapter preview/i)).toBeVisible();
      await expect(guestPage.getByRole("heading", { name: target.title })).toBeVisible();

      assertNoBrowserErrors(tracker);
    } finally {
      await updateCatalogState(target.kind, target.slug, original);
    }
  });
});
