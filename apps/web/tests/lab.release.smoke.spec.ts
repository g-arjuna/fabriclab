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
  kind: "lab" as const,
  slug: "lab10-ecmp-hotspot",
  title: "ECMP hotspot: BGP bandwidth community",
  route: "/lab?lab=lab10-ecmp-hotspot",
};

test.describe.serial("Lab release controls smoke", () => {
  test("admin can unpublish and restore a paid lab", async ({ browser, page }) => {
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
      await expect
        .poll(async () => (await readCatalogState(target.kind, target.slug)).is_published)
        .toBe(false);

      const hiddenResponse = await guestPage.goto(`${appUrl}${target.route}`, {
        waitUntil: "domcontentloaded",
      });
      expect(hiddenResponse?.status()).toBe(404);

      await card.getByRole("button", { name: "Live" }).click();
      await card.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText(`Saved ${target.title}.`)).toBeVisible();
      await expect
        .poll(async () => (await readCatalogState(target.kind, target.slug)).is_published)
        .toBe(true);

      const restoredResponse = await guestPage.goto(`${appUrl}${target.route}`, {
        waitUntil: "domcontentloaded",
      });
      expect(restoredResponse?.status()).toBe(200);
      await expect(guestPage.getByText(/Lab locked/i)).toBeVisible();
      await expect(guestPage.getByRole("heading", { name: target.title })).toBeVisible();
      await expect(
        guestPage.getByText(/The simulator, device sessions, and scoring stay unavailable/i),
      ).toBeVisible();

      assertNoBrowserErrors(tracker);
    } finally {
      await updateCatalogState(target.kind, target.slug, original);
      await guestContext.close();
    }
  });
});
