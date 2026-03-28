import { expect, test } from "@playwright/test";

import { assertNoBrowserErrors, smokeEmail, signInWithMagicLink, trackErrors } from "./helpers/liveAuth";

test.describe.serial("Deployed auth and open-access smoke", () => {
  test("guest can open published chapters and labs", async ({ page }) => {
    const tracker = trackErrors(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Master the fabric/i })).toBeVisible();
    await expect(page.getByText("17 chapters. 12 scenario labs. One interactive CLI simulator.")).toBeVisible();
    await expect(page.getByRole("link", { name: "GitHub" })).toHaveCount(0);

    await page.goto("/learn/ch3-the-cli", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Chapter 3: The CLI/i })).toBeVisible();
    await expect(page.getByText(/The investigation always starts with the same three questions/i)).toBeVisible();

    await page.goto("/lab?lab=lab2-congestion", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Diagnose fabric congestion/i })).toBeVisible();
    await expect(page.getByText(/GPU training throughput has dropped 40%/i)).toBeVisible();

    assertNoBrowserErrors(tracker);
  });

  test("signed-in users get account features without changing public access", async ({ page }) => {
    const tracker = trackErrors(page);

    await signInWithMagicLink(page);

    await page.goto("/account", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(smokeEmail)).toBeVisible();
    await expect(page.getByText(/Admin access enabled\./i)).toBeVisible();
    await expect(page.getByText(/Full public catalog/i)).toBeVisible();

    await page.goto("/learn/ch3-the-cli", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Chapter 3: The CLI/i })).toBeVisible();
    await expect(page.getByText(/The investigation always starts with the same three questions/i)).toBeVisible();

    await page.goto("/lab?lab=lab2-congestion", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Diagnose fabric congestion/i })).toBeVisible();
    await expect(page.getByText(/GPU training throughput has dropped 40%/i)).toBeVisible();

    assertNoBrowserErrors(tracker);
  });
});
